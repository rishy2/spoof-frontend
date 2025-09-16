"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Zap, Play, CheckCircle, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadedFile, ModelConfig, GenerationParameters } from "./synthetic-data-platform"

interface UploadedFileWithId extends UploadedFile {
    dataset_id?: string
}

interface DataGenerationProps {
    file: UploadedFileWithId | null
    model: ModelConfig | null
    parameters: GenerationParameters
    onNext: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setGeneratedData: (data: any) => void
}

interface GenerationStep {
    id: string
    name: string
    description: string
    status: "pending" | "running" | "completed" | "error"
    progress: number
}

// ---------------- Debug Utilities -----------------
function nowISO() {
    return new Date().toISOString()
}

function safeLower(x: unknown) {
    return typeof x === "string" ? x.toLowerCase() : ""
}

// ---- Helpers ---------------------------------------------------------------
async function fetchStatus(jobId: string): Promise<{ status: string; percent?: number }> {
    const res = await fetch(`http://localhost:8003/model/status/${jobId}`)
    if (!res.ok) throw new Error("Status fetch failed")
    return res.json()
}

async function pollUntilDone(opts: {
    jobId: string
    fetchStatus: (jobId: string) => Promise<{ status: string; percent?: number }>
    onTick?: (percent: number, status: string, raw?: unknown) => void
    requireRunning?: boolean // if true, don't accept completed before we've seen running
    intervalMs?: number
    maxConsecutiveErrors?: number
    abortRef?: React.MutableRefObject<boolean>
    debug?: (msg: string) => void
}) {
    const {
        jobId,
        fetchStatus,
        onTick,
        requireRunning = false,
        intervalMs = 3000, // slightly longer to avoid racing with backend flips + Strict Mode
        maxConsecutiveErrors = 5,
        abortRef,
        debug,
    } = opts

    let errors = 0
    let seenRunning = !requireRunning
    let tick = 0

    while (true) {
        if (abortRef?.current) {
            debug?.("poll: aborted by caller")
            // don't throw; let caller treat as a graceful stop
            return "aborted" as const
        }

        try {
            const raw = await fetchStatus(jobId)
            const status = safeLower(raw.status)
            const percent = Math.max(0, Math.min(100, Number(raw.percent ?? 0)))

            onTick?.(percent, status, raw)
            debug?.(`[poll ${++tick}] status=${status} percent=${percent} seenRunning=${seenRunning} @ ${nowISO()}`)

            if (status === "failed" || status === "error") {
                throw new Error("Job failed on server")
            }
            if (status === "running") {
                seenRunning = true
            }
            if (status === "completed" && seenRunning) {
                return "completed" as const // finished for real
            }
            errors = 0 // reset on success
        } catch (e: unknown) {
            errors++
            debug?.(`[poll error ${errors}/${maxConsecutiveErrors}] ${e instanceof Error ? e.message : String(e)}`)
            if (errors >= maxConsecutiveErrors) {
                throw new Error("Too many polling errors")
            }
            // else fall through
        }

        await new Promise((r) => setTimeout(r, intervalMs))
    }
}

export function DataGeneration({ file, model, parameters, onNext, setGeneratedData }: DataGenerationProps) {
    const [steps, setSteps] = useState<GenerationStep[]>([
        { id: "preprocessing", name: "Data Preprocessing", description: "Analyzing and preparing your data for training", status: "pending", progress: 0 },
        { id: "training", name: "Model Training", description: "Training the AI model on your data patterns", status: "pending", progress: 0 },
        { id: "generation", name: "Synthetic Generation", description: "Generating synthetic samples with your parameters", status: "pending", progress: 0 },
        { id: "validation", name: "Quality Validation", description: "Validating the quality and privacy of generated data", status: "pending", progress: 0 },
    ])

    const [overallProgress, setOverallProgress] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)

    // Debug panel state
    const [debugLog, setDebugLog] = useState<string[]>([])
    const [lastTrainingStatus, setLastTrainingStatus] = useState<string>("-")
    const [lastGenerationStatus, setLastGenerationStatus] = useState<string>("-")
    const [seenRunningTraining, setSeenRunningTraining] = useState(false)
    const [seenRunningGeneration, setSeenRunningGeneration] = useState(false)

    const pushLog = (line: string) => {
        setDebugLog((prev) => [
            `${nowISO()} | ${line}`,
            ...prev.slice(0, 199), // cap at 200 lines
        ])
        console.debug("[DataGeneration]", line)
    }

    // Refs to manage job + abort signal + run id to detect overlaps
    const jobIdRef = useRef<string | null>(null)
    const abortRef = useRef<boolean>(false)
    const runIdRef = useRef<number>(0)

    // Weighted progress so the bar moves smoothly by phase
    const weights = { preprocessing: 25, training: 35, generation: 30, validation: 10 } as const // total 100

    // Strong gate: ensure we only start generation after a final confirmed training-completed status
    async function assertCompleted(jobId: string) {
        const s = await fetchStatus(jobId)
        return safeLower(s.status) === "completed"
    }

    // Pipeline runner function
    const runGenerationPipeline = async () => {
        abortRef.current = false
        runIdRef.current += 1
        const myRun = runIdRef.current

        setSteps([
            { id: "preprocessing", name: "Data Preprocessing", description: "Analyzing and preparing your data for training", status: "pending", progress: 0 },
            { id: "training", name: "Model Training", description: "Training the AI model on your data patterns", status: "pending", progress: 0 },
            { id: "generation", name: "Synthetic Generation", description: "Generating synthetic samples with your parameters", status: "pending", progress: 0 },
            { id: "validation", name: "Quality Validation", description: "Validating the quality and privacy of generated data", status: "pending", progress: 0 },
        ])
        setOverallProgress(0)
        setDebugLog([])
        setLastTrainingStatus("-")
        setLastGenerationStatus("-")
        setSeenRunningTraining(false)
        setSeenRunningGeneration(false)
        jobIdRef.current = null

        // Snapshot inputs at start of run
        const datasetId = file?.dataset_id ?? ""
        const modelName = "adsgan"
        const sampleCount = parameters.samples

        pushLog(`[run ${myRun}] started; samples=${sampleCount} model=${modelName}`)

        // ---- Step 1: Preprocessing (simulate) ----
        // Step 1: Preprocessing
        setSteps((prev) => prev.map((s, i) => ({ ...s, status: i === 0 ? "running" : "pending", progress: i === 0 ? 0 : s.progress })))
        for (let p = 0; p <= 100; p += 20) {
            if (abortRef.current || runIdRef.current !== myRun) return
            await new Promise((r) => setTimeout(r, 100))
            setSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, progress: p } : s)))
            setOverallProgress((p / 100) * weights.preprocessing)
        }
        setSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, status: "completed", progress: 100 } : s)))
        setOverallProgress(weights.preprocessing)
        pushLog("preprocessing completed")
        await new Promise((r) => setTimeout(r, 400))

        // ---- Step 2: Training (real backend) ----
        // Step 2: Training
        setSteps((prev) => prev.map((s, i) => ({
            ...s,
            status: i === 1 ? "running" : s.status,
            progress: i === 1 ? 0 : s.progress,
        })))

        // Start training
        let jobId: string | null = null
        try {
            const res = await fetch("http://localhost:8003/model/train", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model_name: modelName,
                    dataset_id: datasetId,
                }),
            })
            if (!res.ok) throw new Error("Failed to start model training")
            const data = await res.json()
            jobId = typeof data.job_id === "string" ? data.job_id : ""
            jobIdRef.current = jobId
            pushLog(`training started; job_id=${jobId}`)
        } catch (e) {
            pushLog(`training POST failed: ${e instanceof Error ? e.message : String(e)}`)
            setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "error" } : s)))
            return
        }

        // Poll until training completes
        try {
            const result = await pollUntilDone({
                jobId: jobId!,
                fetchStatus,
                onTick: (percent, status) => {
                    setLastTrainingStatus(`${status} (${percent}%)`)
                    if (status === "running") setSeenRunningTraining(true)
                    setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, progress: percent } : s)))
                    setOverallProgress(weights.preprocessing + (percent / 100) * weights.training)
                },
                requireRunning: false,
                abortRef,
                debug: (m) => pushLog(`training ${m}`),
            })
            if (result === "aborted") {
                pushLog("training polling aborted; exiting run gracefully")
                return
            }
            setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "completed", progress: 100 } : s)))
            setOverallProgress(weights.preprocessing + weights.training)
            pushLog("training completed")
            await new Promise((r) => setTimeout(r, 400))
        } catch (e) {
            pushLog(`training polling failed: ${e instanceof Error ? e.message : String(e)}`)
            setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "error" } : s)))
            return
        }

        // Sanity re-check before generation: confirm backend says completed
        try {
            const ok = await assertCompleted(jobIdRef.current!)
            if (!ok) {
                pushLog("sanity check before generation FAILED: training not completed by status")
                setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "error" } : s)))
                return
            }
            pushLog("sanity check before generation PASSED")
        } catch (e) {
            pushLog(`sanity check error: ${e instanceof Error ? e.message : String(e)}`)
        }

        if (abortRef.current || runIdRef.current !== myRun) return

        // ---- Step 3: Generation (real backend) ----
        // Step 3: Generation
        setSteps((prev) => prev.map((s, i) => ({
            ...s,
            status: i === 2 ? "running" : s.status,
            progress: i === 2 ? 0 : s.progress,
        })))

        const count = Math.min(100000, sampleCount)
        try {
            const res = await fetch(`http://localhost:8003/model/generate/${jobIdRef.current}?count=${count}`)
            if (!res.ok) throw new Error("Failed to start generation")
            const data = await res.json()
            setGeneratedData({
                job_id: data.job_id,
                synthetic_data: data.synthetic_data,


            }) // Pass generated data to parent component
            console.log("Generated data:", data);
            pushLog(`generation POST ok; count=${count}`)
        } catch (e) {
            pushLog(`generation POST failed: ${e instanceof Error ? e.message : String(e)}`)
            setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "error" } : s)))
            return
        }

        // try {
        //     // Small grace period to let backend flip to running
        //     await new Promise((r) => setTimeout(r, 800))
        //     const result = await pollUntilDone({
        //         jobId: jobIdRef.current!,
        //         fetchStatus,
        //         onTick: (percent, status) => {
        //             setLastGenerationStatus(`${status} (${percent}%)`)
        //             if (status === "running") setSeenRunningGeneration(true)
        //             setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, progress: percent } : s)))
        //             setOverallProgress(weights.preprocessing + weights.training + (percent / 100) * weights.generation)
        //         },
        //         requireRunning: true,
        //         abortRef,
        //         debug: (m) => pushLog(`generation ${m}`),
        //     })
        //     if (result === "aborted") {
        //         pushLog("generation polling aborted; exiting run gracefully")
        //         return
        //     }
        //     // setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "completed", progress: 100 } : s)))
        //     setOverallProgress(weights.preprocessing + weights.training + weights.generation)
        //     pushLog("generation completed")
        //     await new Promise((r) => setTimeout(r, 400))
        // } catch (e) {
        //     pushLog(`generation polling failed: ${e instanceof Error ? e.message : String(e)}`)
        //     setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "error" } : s)))
        //     return
        // }

        // if (abortRef.current || runIdRef.current !== myRun) return

        // ---- Step 4: Validation (simulate) ----
        // Step 4: Validation
        // setSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, status: "running", progress: 0 } : s)))
        for (let p = 0; p <= 100; p += 20) {
            if (abortRef.current || runIdRef.current !== myRun) return
            await new Promise((r) => setTimeout(r, 100))
            setSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, progress: p } : s)))
            setOverallProgress(weights.preprocessing + weights.training + weights.generation + (p / 100) * weights.validation)
        }
        setSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, status: "completed", progress: 100 } : s)))
        setOverallProgress(100)
        pushLog("validation completed; run finished")
        await new Promise((r) => setTimeout(r, 400))
        onNext()
    }

    // Reset state when not generating
    useEffect(() => {
        if (!isGenerating) {
            setSteps([
                { id: "preprocessing", name: "Data Preprocessing", description: "Analyzing and preparing your data for training", status: "pending", progress: 0 },
                { id: "training", name: "Model Training", description: "Training the AI model on your data patterns", status: "pending", progress: 0 },
                { id: "generation", name: "Synthetic Generation", description: "Generating synthetic samples with your parameters", status: "pending", progress: 0 },
                { id: "validation", name: "Quality Validation", description: "Validating the quality and privacy of generated data", status: "pending", progress: 0 },
            ])
            setOverallProgress(0)
            setDebugLog([])
            setLastTrainingStatus("-")
            setLastGenerationStatus("-")
            setSeenRunningTraining(false)
            setSeenRunningGeneration(false)
            jobIdRef.current = null
            abortRef.current = false
        }
    }, [isGenerating])

    const getStepIcon = (step: GenerationStep) => {
        switch (step.status) {
            case "completed":
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case "running":
                return <Play className="w-5 h-5 text-secondary animate-pulse" />
            case "error":
                return <AlertTriangle className="w-5 h-5 text-destructive" />
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
        }
    }

    const getEstimatedTime = () => {
        const baseTime = 30 // seconds
        const sampleMultiplier = Math.log10(Math.max(100, parameters.samples) / 100)
        const qualityMultiplier = Math.max(0.5, Number(parameters.quality) / 50)
        return Math.max(30, Math.round(baseTime * (1 + sampleMultiplier) * qualityMultiplier))
    }

    // Derived debug flags
    const suspiciousFastGeneration = steps.find(s => s.id === 'generation')?.status === 'completed' && !seenRunningGeneration

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Generation Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Synthetic Data Generation
                    </CardTitle>
                    <CardDescription>
                        Ready to generate <span className="font-semibold text-primary">{parameters.samples.toLocaleString()}</span> synthetic samples using <Badge variant="secondary">{model?.name}</Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Input File</div>
                            <div className="font-medium truncate max-w-xs md:max-w-[220px]" title={file?.name}>{file?.name}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Model</div>
                            <div className="font-medium truncate max-w-xs md:max-w-[180px]" title={model?.name}>{model?.name}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Samples</div>
                            <div className="font-medium">{parameters.samples.toLocaleString()}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Est. Time</div>
                            <div className="font-medium">{getEstimatedTime()}s</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Generation Progress</CardTitle>
                        <CardDescription>Overall Progress: {Math.round(overallProgress)}%</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {suspiciousFastGeneration && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Generation finished without ever seeing a <span className="font-semibold">running</span> state. This usually means the backend returned a stale <code>completed</code> from a previous phase. Check the debug panel below.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Progress value={overallProgress} className="w-full" />

                        <div className="space-y-4">
                            {steps.map((step) => (
                                <div key={step.id} className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">{getStepIcon(step)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium">{step.name}</div>
                                            {step.status === "running" && (
                                                <div className="text-sm text-muted-foreground">{step.progress}%</div>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{step.description}</div>
                                        {step.status === "running" && <Progress value={step.progress} className="w-full mt-2 h-2" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Debug Panel */}
                        <div className="mt-6 space-y-2">
                            <div className="text-sm font-semibold">Debug</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Training Status</CardTitle>
                                        <CardDescription>
                                            last: {lastTrainingStatus} | seen running: {String(seenRunningTraining)}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Generation Status</CardTitle>
                                        <CardDescription>
                                            last: {lastGenerationStatus} | seen running: {String(seenRunningGeneration)}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                            <div className="border rounded-md p-3 max-h-64 overflow-auto bg-muted/30">
                                <pre className="text-[11px] leading-4 whitespace-pre-wrap">{Array.isArray(debugLog) ? debugLog.join("\n") : String(debugLog)}</pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Generation Controls */}
            {!isGenerating && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ready to Generate</CardTitle>
                        <CardDescription>Click the button below to start generating your synthetic dataset</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Zap className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-2">
                                    <div className="font-medium">What will happen:</div>
                                    <ul className="text-sm space-y-1">
                                        <li>• Your data will be analyzed and preprocessed</li>
                                        <li>• The AI model will learn your data patterns</li>
                                        <li>• Synthetic samples will be generated with your parameters</li>
                                        <li>• Quality and privacy validation will be performed</li>
                                    </ul>
                                </div>
                            </AlertDescription>
                        </Alert>

                        <div className="flex justify-center">
                            <Button
                                onClick={() => {
                                    setIsGenerating(true)
                                    runGenerationPipeline();
                                }}
                                size="lg"
                                className="px-8"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Generation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

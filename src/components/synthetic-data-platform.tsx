"use client"

import { useState } from "react"
import { FileUpload } from "./file-upload"
import { ModelSelection } from "./model-selection"
import { ParameterControls } from "./parameter-controls"
import { DataGeneration } from "./data-generation"
import { ResultsDisplay } from "./results-display"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Database, Upload, Brain, Settings, Play, BarChart3, Sparkles, ChevronRight } from "lucide-react"
import { on } from "events"

export type WorkflowStep = "upload" | "model" | "parameters" | "generate" | "results"

export interface UploadedFile {
    name: string
    size: number
    type: string
    content: string
}

export interface ModelConfig {
    id: string
    name: string
    description: string
    type: "tabular" | "text" | "image"
    details?: string[]
}

export interface GenerationParameters {
    samples: number
    privacy: number
    quality: number
    diversity: number
}

export interface GeneratedData {
    job_id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    synthetic_data: Record<string, any>[]
    // samples: number
    // format: string
    // size: string
}

export function SyntheticDataPlatform() {
    const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload")
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
    const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null)
    const [parameters, setParameters] = useState<GenerationParameters>({
        samples: 1000,
        privacy: 50,
        quality: 75,
        diversity: 60,
    })
    const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleFileUpload = (file: UploadedFile) => {
        setUploadedFile(file)
        setCurrentStep("model")
    }

    const handleModelSelect = (model: ModelConfig) => {
        setSelectedModel(model)
        setCurrentStep("parameters")
    }

    const handleParametersSet = (params: GenerationParameters) => {
        setParameters(params)
        setCurrentStep("generate")
    }

    const handleResultsView = () => {
        setCurrentStep("results")
    }

    // const handleGenerate = async () => {
    //     setIsGenerating(true)

    //     // Simulate data generation process
    //     await new Promise((resolve) => setTimeout(resolve, 3000))

    //     const result: GeneratedData = {
    //         id: `gen_${Date.now()}`,
    //         timestamp: new Date(),
    //         samples: parameters.samples,
    //         format: "CSV",
    //         size: `${Math.round(parameters.samples * 0.05)}KB`,
    //         downloadUrl: "#",
    //     }

    //     setGeneratedData(result)
    //     setIsGenerating(false)
    //     setCurrentStep("results")
    // }

    const resetWorkflow = () => {
        setCurrentStep("upload")
        setUploadedFile(null)
        setSelectedModel(null)
        setGeneratedData(null)
        setIsGenerating(false)
    }

    const getProgressPercentage = () => {
        const steps = ["upload", "model", "parameters", "generate", "results"]
        const currentIndex = steps.indexOf(currentStep)
        return ((currentIndex + 1) / steps.length) * 100
    }

    const getStepStatus = (step: WorkflowStep) => {
        const steps = ["upload", "model", "parameters", "generate", "results"]
        const currentIndex = steps.indexOf(currentStep)
        const stepIndex = steps.indexOf(step)

        if (stepIndex < currentIndex) return "completed"
        if (stepIndex === currentIndex) return "active"
        return "pending"
    }

    const handleStepClick = (step: WorkflowStep) => {
        const steps = ["upload", "model", "parameters", "generate", "results"]
        const currentIndex = steps.indexOf(currentStep)
        const targetIndex = steps.indexOf(step)

        // Only allow navigation to completed steps or the current step
        if (targetIndex <= currentIndex) {
            setCurrentStep(step)
        }
    }

    return (
        <div className="flex h-screen bg-background">
            <div className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-sidebar-border">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-sidebar-foreground">Spoof</h1>
                            <p className="text-xs text-muted-foreground">Synthetic Data Platform</p>
                        </div>
                    </div>
                </div>

                {/* Workflow Progress */}
                <div className="flex-1 p-4">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-sidebar-foreground">Workflow Progress</h3>
                            <span className="text-xs text-muted-foreground">{Math.round(getProgressPercentage())}%</span>
                        </div>
                        <Progress value={getProgressPercentage()} className="h-2" />
                    </div>

                    <div className="space-y-2">
                        {[
                            { step: "upload" as WorkflowStep, icon: Upload, label: "Upload Dataset", desc: "Import your data file" },
                            { step: "model" as WorkflowStep, icon: Brain, label: "Select Model", desc: "Choose AI model type" },
                            {
                                step: "parameters" as WorkflowStep,
                                icon: Settings,
                                label: "Configure",
                                desc: "Adjust generation settings",
                            },
                            { step: "generate" as WorkflowStep, icon: Play, label: "Generate", desc: "Create synthetic data" },
                            { step: "results" as WorkflowStep, icon: BarChart3, label: "Results", desc: "Download & analyze" },
                        ].map(({ step, icon: Icon, label, desc }) => {
                            const status = getStepStatus(step)
                            const isClickable = status === "completed" || status === "active"

                            return (
                                <div
                                    key={step}
                                    className={`flex items-start gap-3 p-3 rounded-lg text-sm transition-colors ${status === "active"
                                        ? "bg-primary text-primary-foreground"
                                        : status === "completed"
                                            ? "bg-secondary/20 text-secondary hover:bg-secondary/30 cursor-pointer"
                                            : "text-muted-foreground"
                                        } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                                    onClick={() => isClickable && handleStepClick(step)}
                                >
                                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-xs">{label}</div>
                                        <div className="text-xs opacity-70 mt-0.5">{desc}</div>
                                    </div>
                                    {status === "completed" && <div className="w-2 h-2 rounded-full bg-secondary mt-1 flex-shrink-0" />}
                                    {status === "active" && <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" />}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Reset Button */}
                {currentStep !== "upload" && (
                    <div className="p-4 border-t border-sidebar-border">
                        <Button variant="outline" onClick={resetWorkflow} size="sm" className="w-full text-xs bg-transparent">
                            New Project
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-card/30 border-b border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {currentStep === "upload" && "Upload Data"}
                                {currentStep === "model" && "Select Model"}
                                {currentStep === "parameters" && "Configure"}
                                {currentStep === "generate" && "Generate"}
                                {currentStep === "results" && "Results"}
                            </h2>
                        </div>
                        {uploadedFile && (
                            <Badge variant="secondary" className="text-xs">
                                <Database className="w-3 h-3 mr-1" />
                                {uploadedFile.name}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-3xl mx-auto">
                        {currentStep === "upload" && (
                            <div>
                                <div className="mb-6">
                                    <p className="text-muted-foreground text-sm">
                                        Start by uploading your dataset. Spoof supports CSV, JSON, and Excel files up to 50MB.
                                    </p>
                                </div>
                                <FileUpload onFileUpload={handleFileUpload} />
                            </div>
                        )}

                        {currentStep === "model" && uploadedFile && (
                            <div>
                                <div className="mb-6">
                                    <p className="text-muted-foreground text-sm">
                                        Choose the AI model that best fits your data type. Each model is optimized for different data
                                        structures and use cases to ensure high-quality synthetic data generation.
                                    </p>
                                </div>
                                <ModelSelection uploadedFile={uploadedFile} onModelSelect={handleModelSelect} />
                            </div>
                        )}

                        {currentStep === "parameters" && selectedModel && (
                            <div>
                                <div className="mb-6">
                                    <p className="text-muted-foreground text-sm">
                                        Fine-tune the generation parameters to balance data quality, privacy protection, and diversity.
                                        These settings control how closely the synthetic data matches your original dataset.
                                    </p>
                                </div>
                                <ParameterControls
                                    model={selectedModel}
                                    parameters={parameters}
                                    onParametersChange={setParameters}
                                    onNext={handleParametersSet}
                                />
                            </div>
                        )}

                        {currentStep === "generate" && (
                            <div>
                                <div className="mb-6">
                                    <p className="text-muted-foreground text-sm">
                                        Ready to generate your synthetic dataset! The process typically takes 1-3 minutes depending on your
                                        data size and selected parameters. You can monitor progress in real-time.
                                    </p>
                                </div>
                                <DataGeneration
                                    file={uploadedFile}
                                    model={selectedModel}
                                    parameters={parameters}
                                    onNext={handleResultsView}
                                    setGeneratedData={setGeneratedData}
                                />
                            </div>
                        )}

                        {currentStep === "results" && generatedData && (
                            <div>
                                <div className="mb-6">
                                    <p className="text-muted-foreground text-sm">
                                        Your synthetic dataset has been successfully generated! Review the quality metrics, preview the
                                        data, and download in your preferred format.
                                    </p>
                                </div>
                                <ResultsDisplay generatedData={generatedData} onReset={resetWorkflow} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

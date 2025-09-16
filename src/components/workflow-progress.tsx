import { CheckCircle, Upload, Brain, Settings, Zap, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkflowStep } from "./synthetic-data-platform"

interface WorkflowProgressProps {
    currentStep: WorkflowStep
}

const steps = [
    { id: "upload", label: "Upload Data", icon: Upload },
    { id: "model", label: "Select Model", icon: Brain },
    { id: "parameters", label: "Set Parameters", icon: Settings },
    { id: "generate", label: "Generate", icon: Zap },
    { id: "results", label: "Results", icon: Download },
] as const

export function WorkflowProgress({ currentStep }: WorkflowProgressProps) {
    const currentIndex = steps.findIndex((step) => step.id === currentStep)

    return (
        <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => {
                const Icon = step.icon
                const isCompleted = index < currentIndex
                const isCurrent = index === currentIndex
                const isUpcoming = index > currentIndex

                return (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors",
                                    isCompleted && "bg-primary border-primary text-primary-foreground",
                                    isCurrent && "bg-secondary border-secondary text-secondary-foreground",
                                    isUpcoming && "bg-muted border-border text-muted-foreground",
                                )}
                            >
                                {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                            </div>
                            <span
                                className={cn(
                                    "mt-2 text-sm font-medium",
                                    isCompleted && "text-primary",
                                    isCurrent && "text-secondary",
                                    isUpcoming && "text-muted-foreground",
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn("w-16 h-0.5 mx-4 transition-colors", index < currentIndex ? "bg-primary" : "bg-border")}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

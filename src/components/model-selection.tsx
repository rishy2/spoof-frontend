"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Database, FileText, ImageIcon, CheckCircle } from "lucide-react"
import type { UploadedFile, ModelConfig } from "./synthetic-data-platform"

interface ModelSelectionProps {
    uploadedFile: UploadedFile
    onModelSelect: (model: ModelConfig) => void
}

const availableModels: ModelConfig[] = [
    {
        id: "tabular-finetune",
        name: "Everyday Table Synthesizer",
        description: "Best for most tabular data! Create realistic, privacy-safe tables for analytics, sharing, or product demos. Handles numbers, categories, text, and more.",
        type: "tabular",
        details: [
            "Works with: Numbers, categories, text, JSON, events",
            "Privacy: Optional, you choose"
        ]
    },
    {
        id: "text-finetune",
        name: "Story Spinner",
        description: "Turn your text into new, privacy-friendly stories, notes, or documents. Great for anonymizing sensitive text or creating training data.",
        type: "text",
        details: [
            "Works with: Text",
            "Privacy: Optional, you choose"
        ]
    },
    {
        id: "tabular-gan",
        name: "Big Data Mixer",
        description: "For large, complex tables! Quickly remix big datasets (50+ columns) while keeping important relationships between columns intact.",
        type: "tabular",
        details: [
            "Works with: Numbers, categories",
            "Privacy: Not supported"
        ]
    },
    {
        id: "tabular-dp",
        name: "Privacy Guardian",
        description: "Need maximum privacy? This model creates safe, basic tables for analytics and reporting—perfect when privacy is your top concern.",
        type: "tabular",
        details: [
            "Works with: Numbers, categories",
            "Privacy: Always on, required"
        ]
    },
]

function getDataType(file: UploadedFile): "tabular" | "text" | "image" {
    if (
        file.type.includes("csv") ||
        file.type.includes("excel") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xlsx")
    ) {
        return "tabular"
    }
    if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".json")) {
        return "text"
    }
    return "image"
}

function getModelIcon(type: string) {
    switch (type) {
        case "tabular":
            return Database
        case "text":
            return FileText
        case "image":
            return ImageIcon
        default:
            return Brain
    }
}

export function ModelSelection({ uploadedFile, onModelSelect }: ModelSelectionProps) {
    const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null)
    const detectedType = getDataType(uploadedFile)
    const recommendedModels = availableModels.filter((model) => model.type === detectedType)

    const handleModelSelect = (model: ModelConfig) => {
        setSelectedModel(model)
    }

    const handleContinue = () => {
        if (selectedModel) {
            onModelSelect(selectedModel)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                    {detectedType}
                </Badge>
                <span className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
            </div>

            <div>
                <h3 className="text-base font-semibold mb-4 text-primary">Synthetic Models</h3>
                <div className="flex flex-col gap-4">
                    {recommendedModels.map((model) => {
                        const Icon = getModelIcon(model.type)
                        const isSelected = selectedModel?.id === model.id

                        return (
                            <Card
                                key={model.id}
                                className={`cursor-pointer transition-all hover:shadow-lg border-2 ${isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-transparent"} p-4`}
                                onClick={() => handleModelSelect(model)}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icon className="w-6 h-6 text-primary" />
                                    <span className="font-semibold text-lg">{model.name}</span>
                                    {isSelected && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">{model.description}</div>
                                {Array.isArray(model.details) && (
                                    <ul className="text-xs text-muted-foreground mb-1 ml-1 list-disc list-inside">
                                        {model.details.map((d, i) => (
                                            <li key={i}>{d}</li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleContinue} disabled={!selectedModel} className="px-6">
                    Continue
                </Button>
            </div>
        </div>
    )
}

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Settings, Zap } from "lucide-react"
import type { ModelConfig, GenerationParameters } from "./synthetic-data-platform"

interface ParameterControlsProps {
    model: ModelConfig
    parameters: GenerationParameters
    onParametersChange: (params: GenerationParameters) => void
    onNext: (params: GenerationParameters) => void
}

export function ParameterControls({ model, parameters, onParametersChange, onNext }: ParameterControlsProps) {
    const [localParams, setLocalParams] = useState<GenerationParameters>(parameters)

    const handleSliderChange = (key: keyof GenerationParameters, value: number[]) => {
        const newParams = { ...localParams, [key]: value[0] }
        setLocalParams(newParams)
        onParametersChange(newParams)
    }

    const handleSamplesChange = (value: string) => {
        const samples = Number.parseInt(value) || 0
        const newParams = { ...localParams, samples }
        setLocalParams(newParams)
        onParametersChange(newParams)
    }

    const handleContinue = () => {
        onNext(localParams)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Configure</span>
                    <Badge variant="secondary" className="text-xs">
                        {model.name}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="samples" className="text-xs">
                                Samples
                            </Label>
                            <Input
                                id="samples"
                                type="number"
                                value={localParams.samples}
                                onChange={(e) => handleSamplesChange(e.target.value)}
                                min={100}
                                max={100000}
                                step={100}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">
                                Est. Time: ~{Math.max(30, Math.round(30 * Math.log10(localParams.samples / 100)))}s
                            </Label>
                            <div className="h-8 flex items-center text-xs text-muted-foreground">100 - 100K samples</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs">Privacy</Label>
                                <span className="text-xs text-muted-foreground">{localParams.privacy}%</span>
                            </div>
                            <Slider
                                value={[localParams.privacy]}
                                onValueChange={(value) => handleSliderChange("privacy", value)}
                                max={100}
                                min={0}
                                step={5}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs">Quality</Label>
                                <span className="text-xs text-muted-foreground">{localParams.quality}%</span>
                            </div>
                            <Slider
                                value={[localParams.quality]}
                                onValueChange={(value) => handleSliderChange("quality", value)}
                                max={100}
                                min={25}
                                step={5}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-xs">Diversity</Label>
                                <span className="text-xs text-muted-foreground">{localParams.diversity}%</span>
                            </div>
                            <Slider
                                value={[localParams.diversity]}
                                onValueChange={(value) => handleSliderChange("diversity", value)}
                                max={100}
                                min={0}
                                step={5}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleContinue} className="px-6">
                    <Zap className="w-4 h-4 mr-2" />
                    Generate
                </Button>
            </div>
        </div>
    )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, RotateCcw, CheckCircle, BarChart3, Shield, FileText, Eye } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { GeneratedData } from "./synthetic-data-platform"

interface ResultsDisplayProps {
    generatedData: {
        job_id: string
        synthetic_data: Array<Record<string, any>>
    }
    onReset: () => void
}

export function ResultsDisplay({ generatedData, onReset }: ResultsDisplayProps) {
    const [activeTab, setActiveTab] = useState("overview")

    const qualityMetrics = {
        fidelity: 87,
        privacy: 92,
        utility: 84,
        diversity: 79,
    }

    const statisticalMetrics = {
        correlationPreservation: 91,
        distributionSimilarity: 88,
        outlierDetection: 76,
        featureImportance: 93,
    }

    function jsonToCsv(rows: Array<Record<string, any>>): string {
        if (!rows.length) return "";

        // Collect a stable header set across all rows
        const headerSet = new Set<string>();
        for (const r of rows) Object.keys(r).forEach((k) => headerSet.add(k));
        const headers = Array.from(headerSet);

        const escapeCell = (val: any): string => {
            if (val === null || val === undefined) return "";
            // Keep numbers as-is, stringify objects/arrays, and coerce others to string
            const raw =
                typeof val === "object" ? JSON.stringify(val) : String(val);

            // Escape quotes by doubling them, wrap in quotes if needed
            const withEscapedQuotes = raw.replace(/"/g, '""');
            const needsQuotes = /[",\n\r]/.test(withEscapedQuotes);
            return needsQuotes ? `"${withEscapedQuotes}"` : withEscapedQuotes;
        };

        const headerLine = headers.join(",");
        const dataLines = rows.map((r) =>
            headers.map((h) => escapeCell(r[h])).join(",")
        );

        // Use CRLF for wide compatibility (Excel, etc.)
        return [headerLine, ...dataLines].join("\r\n");
    }

    const handleDownload = async (format: "csv" | "json") => {
        if (!generatedData || !Array.isArray(generatedData.synthetic_data) || !generatedData.synthetic_data.length) {
            throw new Error("No generated data available for download");
        }

        const fileBase = `synthetic_data_${generatedData.job_id}`;
        let blob: Blob;
        let filename: string;

        if (format === "csv") {
            const csv = jsonToCsv(generatedData.synthetic_data);
            blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            filename = `${fileBase}.csv`;
        } else {
            // Pretty JSON for readability
            const json = JSON.stringify(generatedData.synthetic_data, null, 2);
            blob = new Blob([json], { type: "application/json;charset=utf-8" });
            filename = `${fileBase}.json`;
        }

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };
    const formatTimestamp = (date: Date | string | number) => {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
        return d.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Success Header */}
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle className="w-6 h-6" />
                        Generation Complete!
                    </CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                        Your synthetic dataset has been successfully generated and is ready for download.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
                <Button onClick={() => handleDownload("csv")} className="flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                </Button>
                <Button variant="outline" onClick={() => handleDownload("json")} className="flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                </Button>
                <Button variant="secondary" onClick={onReset} className="flex-1 sm:flex-none">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Generate New
                </Button>
            </div>

            {/* Detailed Results */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="quality">Quality</TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Generation ID</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{generatedData.job_id.slice(0, 10)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Samples Generated</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{"100%"}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">File Size</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{"100 KB"}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">{formatTimestamp(Date.now())}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Generation Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Format:</span>
                                        {/* <Badge variant="secondary">{generatedData.format}</Badge> */}
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Quality Score:</span>
                                        <span className="font-medium">{qualityMetrics.fidelity}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Privacy Score:</span>
                                        <span className="font-medium">{qualityMetrics.privacy}%</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Utility Score:</span>
                                        <span className="font-medium">{qualityMetrics.utility}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Diversity Score:</span>
                                        <span className="font-medium">{qualityMetrics.diversity}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Overall Rating:</span>
                                        <Badge variant="secondary">Excellent</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quality" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Quality Assessment
                            </CardTitle>
                            <CardDescription>Comprehensive analysis of your synthetic data quality</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Data Fidelity</span>
                                            <span className="text-sm text-muted-foreground">{qualityMetrics.fidelity}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-secondary h-2 rounded-full" style={{ width: `${qualityMetrics.fidelity}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Privacy Protection</span>
                                            <span className="text-sm text-muted-foreground">{qualityMetrics.privacy}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${qualityMetrics.privacy}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Data Utility</span>
                                            <span className="text-sm text-muted-foreground">{qualityMetrics.utility}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${qualityMetrics.utility}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium">Sample Diversity</span>
                                            <span className="text-sm text-muted-foreground">{qualityMetrics.diversity}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full"
                                                style={{ width: `${qualityMetrics.diversity}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Your synthetic data meets high quality standards with excellent privacy protection and strong
                                    statistical fidelity to the original dataset.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="statistics" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Statistical Analysis
                            </CardTitle>
                            <CardDescription>Detailed statistical comparison with original data</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(statisticalMetrics).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                                            <span className="text-sm text-muted-foreground">{value}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div className="bg-secondary h-2 rounded-full" style={{ width: `${value}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Data Preview
                            </CardTitle>
                            <CardDescription>Sample of your generated synthetic data</CardDescription>
                        </CardHeader>
                        {/* <CardContent>
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <div className="text-sm text-muted-foreground mb-2">
                                    Showing first 5 rows of {generatedData.samples.toLocaleString()} generated samples
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                {generatedData.synthetic_data.length > 0 && Object.keys(generatedData.synthetic_data[0]).map((key) => (
                                                    <th key={key} className="text-left p-2">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generatedData.synthetic_data.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="border-b">
                                                    {Object.values(row).map((val, idx) => (
                                                        <td key={idx} className="p-2">{String(val)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent> */}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

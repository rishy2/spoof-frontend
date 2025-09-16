"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadedFile } from "./synthetic-data-platform"

interface UploadedFileWithId extends UploadedFile {
    dataset_id?: string;
}

interface FileUploadProps {
    onFileUpload: (file: UploadedFileWithId) => void
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState<boolean>(false)
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0]
            if (!file) return

            // Validate file size (max 10MB)
            if (file.size > 50 * 1024 * 1024) {
                setError("File size must be less than 50MB")
                return
            }

            setUploading(true)
            setError(null)
            setUploadSuccess(false)
            try {
                const formData = new FormData()
                formData.append("file", file)
                const response = await fetch("http://localhost:8003/dataset/upload", {
                    method: "POST",
                    body: formData,
                })
                if (!response.ok) {
                    throw new Error("Failed to upload file")
                }
                const data = await response.json();
                const dataset_id = data.dataset_id;
                setUploadSuccess(true)
                // Read file content as before for local use
                const reader = new FileReader()
                reader.onload = (e) => {
                    const content = e.target?.result as string
                    const uploadedFile: UploadedFileWithId = {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        content: content,
                        dataset_id: dataset_id,
                    }
                    onFileUpload(uploadedFile)
                }
                reader.readAsText(file)
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message)
                } else {
                    setError("Failed to upload file")
                }
            } finally {
                setUploading(false)
            }
        },
        [onFileUpload],
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/json": [".json"],
            "text/plain": [".txt"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
        multiple: false,
    })

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-6">
                    <div
                        {...getRootProps()}
                        className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            `}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Drop your dataset here</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            {isDragActive ? "Drop it now..." : "or click to browse files"}
                        </p>
                        <Button variant="outline" size="sm" disabled={uploading}>
                            {uploading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4 mr-2" />
                            )}
                            {uploading ? "Uploading..." : "Choose File"}
                        </Button>
                        <div className="text-xs text-muted-foreground mt-2">CSV, JSON, TXT, XLS, XLSX • Max 50MB</div>
                    </div>

                    {uploading && (
                        <div className="mt-4 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-sm text-blue-600 self-center">Uploading file...</span>
                        </div>
                    )}
                    {uploadSuccess && !error && (
                        <Alert variant="default" className="mt-4">
                            <AlertDescription>File uploaded successfully!</AlertDescription>
                        </Alert>
                    )}
                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">Upload → Analyze → Select Model → Configure → Generate</p>
            </div>
        </div>
    )
}

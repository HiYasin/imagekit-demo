"use client" // This component must be a client component

import {
    ImageKitAbortError,
    ImageKitInvalidRequestError,
    ImageKitServerError,
    ImageKitUploadNetworkError,
    upload,
    Image,
    ImageKitProvider,
} from "@imagekit/next";

import { useRef, useState } from "react";

// Define the upload response type
interface UploadResponse {
    fileId: string;
    name: string;
    size: number;
    filePath: string;
    url: string;
    fileType: string;
    height?: number;
    width?: number;
    thumbnailUrl?: string;
}

// Define individual file upload progress
interface FileUploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

// UploadExample component demonstrates file uploading using ImageKit's Next.js SDK.
const UploadExample = () => {
    // State to keep track of upload progress for each file
    const [filesProgress, setFilesProgress] = useState<FileUploadProgress[]>([]);

    // State to store all upload responses in an array
    const [uploadResponses, setUploadResponses] = useState<UploadResponse[]>([]);

    // State to store any error messages
    const [error, setError] = useState<string | null>(null);

    // Create a ref for the file input element to access its files easily
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Authenticates and retrieves the necessary upload credentials from the server.

    // This function calls the authentication API endpoint to receive upload parameters like signature,
    // expire time, token, and publicKey.

    // Throws an error if the authentication request fails.

    const authenticator = async () => {
        try {
            // Perform the request to the upload authentication endpoint.
            const response = await fetch("/api/upload-auth");
            if (!response.ok) {
                // If the server response is not successful, extract the error text for debugging.
                const errorText = await response.text();
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }

            // Parse and destructure the response JSON for upload credentials.
            const data = await response.json();
            const { signature, expire, token, publicKey } = data;
            return { signature, expire, token, publicKey };
        } catch (error) {
            // Log the original error for debugging before rethrowing a new error.
            console.error("Authentication error:", error);
            throw new Error("Authentication request failed");
        }
    };

    const handleUpload = async () => {
        // Reset previous states
        setError(null);
        setUploadResponses([]);

        // Access the file input element using the ref
        const fileInput = fileInputRef.current;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            setError("Please select at least one file to upload");
            return;
        }

        // Convert FileList to Array
        const files = Array.from(fileInput.files);

        // Initialize progress tracking for all files
        const initialProgress: FileUploadProgress[] = files.map(file => ({
            fileName: file.name,
            progress: 0,
            status: 'pending'
        }));
        setFilesProgress(initialProgress);

        // Array to store all successful upload responses
        const responses: UploadResponse[] = [];

        // Upload all files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Update status to uploading
            setFilesProgress(prev => prev.map((item, index) =>
                index === i ? { ...item, status: 'uploading' } : item
            ));

            try {
                // Retrieve authentication parameters for each upload
                const authParams = await authenticator();
                const { signature, expire, token, publicKey } = authParams;

                // Create an AbortController for this specific upload
                const abortController = new AbortController();

                // Call the ImageKit SDK upload function
                const uploadResponse = await upload({
                    // Authentication parameters
                    expire,
                    token,
                    signature,
                    publicKey,
                    file,
                    fileName: file.name,
                    folder: process.env.NEXT_PUBLIC_IMAGEKIT_DEFAULT_FOLDER || "/",
                    // Progress callback to update upload progress for this specific file
                    onProgress: (event) => {
                        const progressPercent = (event.loaded / event.total) * 100;
                        setFilesProgress(prev => prev.map((item, index) =>
                            index === i ? { ...item, progress: progressPercent } : item
                        ));
                    },
                    // Abort signal to allow cancellation of the upload if needed
                    abortSignal: abortController.signal,
                });

                console.log(`Upload response for ${file.name}:`, uploadResponse);

                // Add to responses array
                responses.push(uploadResponse as UploadResponse);

                // Update status to completed
                setFilesProgress(prev => prev.map((item, index) =>
                    index === i ? { ...item, status: 'completed', progress: 100 } : item
                ));

            } catch (error) {
                // Handle specific error types provided by the ImageKit SDK
                let errorMessage = "Upload failed";

                if (error instanceof ImageKitAbortError) {
                    errorMessage = `Upload aborted: ${error.reason}`;
                    console.error(`Upload aborted for ${file.name}:`, error.reason);
                } else if (error instanceof ImageKitInvalidRequestError) {
                    errorMessage = `Invalid request: ${error.message}`;
                    console.error(`Invalid request for ${file.name}:`, error.message);
                } else if (error instanceof ImageKitUploadNetworkError) {
                    errorMessage = `Network error: ${error.message}`;
                    console.error(`Network error for ${file.name}:`, error.message);
                } else if (error instanceof ImageKitServerError) {
                    errorMessage = `Server error: ${error.message}`;
                    console.error(`Server error for ${file.name}:`, error.message);
                } else {
                    console.error(`Upload error for ${file.name}:`, error);
                }

                // Update status to error
                setFilesProgress(prev => prev.map((item, index) =>
                    index === i ? { ...item, status: 'error', error: errorMessage } : item
                ));
            }
        }

        // Set all upload responses
        setUploadResponses(responses);

        // Show success message if at least one file was uploaded
        if (responses.length > 0) {
            console.log("All upload responses:", responses);
        } else {
            setError("All uploads failed. Please try again.");
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 space-y-4">
            {/* File input element using React ref - now supports multiple files */}
            <div className="flex flex-col gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
            </div>

            {/* Button to trigger the upload process */}
            <button
                type="button"
                onClick={handleUpload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Upload Files
            </button>

            {/* Display upload progress for each file */}
            {filesProgress.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Upload Progress:</h3>
                    {filesProgress.map((fileProgress, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 truncate">{fileProgress.fileName}</span>
                                <span className={`font-medium ${
                                    fileProgress.status === 'completed' ? 'text-green-600' :
                                    fileProgress.status === 'error' ? 'text-red-600' :
                                    fileProgress.status === 'uploading' ? 'text-blue-600' :
                                    'text-gray-500'
                                }`}>
                                    {fileProgress.status === 'completed' ? '✓ Completed' :
                                     fileProgress.status === 'error' ? '✗ Failed' :
                                     fileProgress.status === 'uploading' ? `${Math.round(fileProgress.progress)}%` :
                                     'Pending'}
                                </span>
                            </div>
                            <progress
                                value={fileProgress.progress}
                                max={100}
                                className="w-full h-2 rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-blue-600 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-blue-600"
                            ></progress>
                            {fileProgress.error && (
                                <p className="text-xs text-red-600">{fileProgress.error}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Display error message if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Display success message and uploaded images */}
            {uploadResponses.length > 0 && (
                <div className="space-y-4 mt-6">
                    {/* Success message */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-600 font-semibold">
                            ✓ {uploadResponses.length} {uploadResponses.length === 1 ? 'file' : 'files'} uploaded successfully!
                        </p>
                    </div>

                    {/* Uploaded Images Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {uploadResponses.map((response, index) => (
                            <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                                <ImageKitProvider urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ''}>
                                    <Image
                                        src={response.name}
                                        width={response.width || 500}
                                        height={response.height || 500}
                                        alt={response.name}
                                        className="w-full h-auto"
                                        loading="lazy"
                                    />
                                </ImageKitProvider>
                                <div className="p-2 bg-white border-t">
                                    <p className="text-xs text-gray-600 truncate">{response.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Raw JSON Response Array (for developers) */}
                    <details className="border rounded-lg bg-gray-50">
                        <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-100">
                            View Raw JSON Response Array ({uploadResponses.length} {uploadResponses.length === 1 ? 'item' : 'items'})
                        </summary>
                        <pre className="p-4 text-xs overflow-x-auto bg-gray-900 text-green-400 rounded-b-lg">
                            {JSON.stringify(uploadResponses, null, 2)}
                        </pre>
                    </details>

                </div>
            )}
        </div>
    );
};

export default UploadExample;

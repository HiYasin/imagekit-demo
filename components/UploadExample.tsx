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

// UploadExample component demonstrates file uploading using ImageKit's Next.js SDK.
const UploadExample = () => {
    // State to keep track of the current upload progress (percentage)
    const [progress, setProgress] = useState(0);

    // State to store the upload response
    const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);

    // State to store any error messages
    const [error, setError] = useState<string | null>(null);

    // Create a ref for the file input element to access its files easily
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Create an AbortController instance to provide an option to cancel the upload if needed.
    const abortController = new AbortController();


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
        setUploadResponse(null);
        setProgress(0);

        // Access the file input element using the ref
        const fileInput = fileInputRef.current;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            setError("Please select a file to upload");
            return;
        }

        // Extract the first file from the file input
        const file = fileInput.files[0];

        // Retrieve authentication parameters for the upload.
        let authParams;
        try {
            authParams = await authenticator();
        } catch (authError) {
            console.error("Failed to authenticate for upload:", authError);
            setError("Authentication failed. Please check your API configuration.");
            return;
        }
        const { signature, expire, token, publicKey } = authParams;

        // Call the ImageKit SDK upload function with the required parameters and callbacks.
        try {
            const uploadResponse = await upload({
                // Authentication parameters
                expire,
                token,
                signature,
                publicKey,
                file,
                fileName: file.name, // Optionally set a custom file name
                folder: process.env.NEXT_PUBLIC_IMAGEKIT_DEFAULT_FOLDER || "/", // Upload to specific folder
                // Progress callback to update upload progress state
                onProgress: (event) => {
                    setProgress((event.loaded / event.total) * 100);
                },
                // Abort signal to allow cancellation of the upload if needed.
                abortSignal: abortController.signal,
            });
            console.log("Upload response:", uploadResponse);
            setUploadResponse(uploadResponse as UploadResponse);
        } catch (error) {
            // Handle specific error types provided by the ImageKit SDK.
            if (error instanceof ImageKitAbortError) {
                console.error("Upload aborted:", error.reason);
                setError(`Upload aborted: ${error.reason}`);
            } else if (error instanceof ImageKitInvalidRequestError) {
                console.error("Invalid request:", error.message);
                setError(`Invalid request: ${error.message}`);
            } else if (error instanceof ImageKitUploadNetworkError) {
                console.error("Network error:", error.message);
                setError(`Network error: ${error.message}`);
            } else if (error instanceof ImageKitServerError) {
                console.error("Server error:", error.message);
                setError(`Server error: ${error.message}`);
            } else {
                // Handle any other errors that may occur.
                console.error("Upload error:", error);
                setError("Upload failed. Please try again.");
            }
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 space-y-4">
            {/* File input element using React ref */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                    Select File
                </label>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
            </div>

            {/* Button to trigger the upload process */}
            <button
                type="button"
                onClick={handleUpload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Upload file
            </button>

            {/* Display the current upload progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Upload progress:</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <progress
                    value={progress}
                    max={100}
                    className="w-full h-2 rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-blue-600 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-blue-600"
                ></progress>
            </div>

            {/* Display error message if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Display success message and uploaded image */}
            {uploadResponse && (
                <div className="space-y-4 mt-6">
                    {/* Success message */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-600 font-semibold">
                            ✓ Upload successful!
                        </p>
                    </div>

                    {/* Uploaded Image Display */}
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <ImageKitProvider urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ''}>
                            <Image
                                src={uploadResponse.name}
                                width={uploadResponse.width || 500}
                                height={uploadResponse.height || 500}
                                alt={uploadResponse.name}
                                className="w-full h-auto"
                                loading="lazy"
                            />
                        </ImageKitProvider>
                    </div>


                    {/* Raw JSON Response (for developers) */}
                    <details className="border rounded-lg bg-gray-50">
                        <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-100">
                            View Raw JSON Response
                        </summary>
                        <pre className="p-4 text-xs overflow-x-auto bg-gray-900 text-green-400 rounded-b-lg">
                            {JSON.stringify(uploadResponse, null, 2)}
                        </pre>
                    </details>

                </div>
            )}
        </div>
    );
};

export default UploadExample;

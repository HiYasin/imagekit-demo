// File: app/api/upload-auth/route.ts
import { getUploadAuthParams } from "@imagekit/next/server"

export async function GET() {
    // Your application logic to authenticate the user
    // For example, you can check if the user is logged in or has the necessary permissions
    // If the user is not authenticated, you can return an error response

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;


    if (!privateKey || !publicKey) {
        return Response.json(
            { error: 'ImageKit credentials not configured. Please check your environment variables.' },
            { status: 500 }
        );
    }

    const { token, expire, signature } = getUploadAuthParams({
        privateKey: privateKey,
        publicKey: publicKey,
    })

    return Response.json({ token, expire, signature, publicKey: publicKey })
}

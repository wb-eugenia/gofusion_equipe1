import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const badgeId = formData.get('badgeId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'image/png') {
      return NextResponse.json({ error: 'File must be PNG format' }, { status: 400 });
    }

    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/badges directory exists
    const badgesDir = join(process.cwd(), 'public', 'badges');
    if (!existsSync(badgesDir)) {
      await mkdir(badgesDir, { recursive: true });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `badge-${badgeId}-${timestamp}.png`;
    const filepath = join(badgesDir, filename);
    
    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      message: `Badge icon uploaded successfully`,
      filename: filename,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

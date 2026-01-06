# Image Upload Feature Setup Guide

## Overview
This document explains the URL-based image upload feature that has been implemented for the admin product image management system.

## Features Implemented

### 1. **Two Image Upload Methods**
The admin image manager now supports two ways to add images:

#### Method 1: Upload from URL
- Admin pastes an external image URL (e.g., from another website)
- System downloads the image from that URL
- Image is stored locally in the project directory
- Local path is saved in the database

#### Method 2: Direct File Upload
- Admin selects an image file from their computer
- File is uploaded directly to the server
- File is stored in the local project directory
- Local path is saved in the database

### 2. **Frontend Implementation**

**File Modified:** `src/app/components/product-image-manager/product-image-manager.component.ts`

#### New Properties:
```typescript
imageInputMode: string = 'url';        // Toggle between 'url' and 'file' modes
selectedFile: File | null = null;      // Stores selected file for upload
```

#### New Methods:
```typescript
onFileSelected(event: any)              // Handles file input change
downloadAndAddImage()                   // Downloads image from URL
uploadAndAddImage()                     // Uploads file directly
```

#### UI Template Changes:
- Added tab-based interface to switch between URL and File upload
- URL tab: Text input for image URL + download button
- File tab: File input + upload button
- Both methods include optional alt text field
- Error messages display for validation and network errors

#### Styling:
- `.form-tabs` - Tab navigation container
- `.tab-button` - Individual tab buttons with active states
- `.input-section` - Active input mode container with fade-in animation
- `.hint` - Helper text for user guidance

### 3. **Backend Implementation**

**File Modified:** `src/main.server.ts`

#### New Dependencies Added:
- `axios` - For making HTTP requests to external URLs
- `multer` - For handling file uploads
- `uuid` - For generating unique filenames

#### New API Endpoints:

**POST `/api/images/download-from-url`**
```json
Request Body:
{
  "imageUrl": "https://example.com/image.jpg",
  "altText": "Optional description",
  "productId": 123
}

Response:
{
  "success": true,
  "imageUrl": "/assets/images/products/uploads/uuid.jpg",
  "message": "Image downloaded and saved successfully"
}
```

**POST `/api/images/upload-file`**
```
Request: multipart/form-data
  - file: Binary image file
  - productId: Product ID
  - altText: Optional description

Response:
{
  "success": true,
  "imageUrl": "/assets/images/products/uploads/uuid.jpg",
  "message": "File uploaded successfully"
}
```

#### Server Configuration:
- Upload directory: `public/assets/images/products/uploads/`
- Maximum file size: 10 MB
- Accepted file types: Image files only (png, jpg, jpeg, webp, gif)
- File naming: UUID-based to prevent conflicts
- Automatic directory creation on server start

### 4. **Build Configuration**

**File Updated:** `package.json`

New npm scripts added:
```bash
npm run build:server          # Compile TypeScript server files
npm run build:ssr            # Full SSR build
npm run serve:ssr            # Start the SSR server
```

## Directory Structure

```
public/
└── assets/
    └── images/
        └── products/
            └── uploads/          # Where downloaded/uploaded images are stored
                ├── uuid1.jpg
                ├── uuid2.png
                └── ...

dist/vsp-electronics/
├── browser/                  # Client-side build
│   ├── main.*.js
│   ├── styles.css
│   └── assets/
└── (server files in out-tsc/)
```

## Security Features

1. **File Type Validation**: Only image files are accepted
2. **File Size Limits**: 10 MB maximum per image
3. **UUID Filenames**: Prevents directory traversal attacks
4. **URL Validation**: Validates URL format before download
5. **Timeout Protection**: 10-second timeout on external URL requests
6. **Admin-Only Access**: Features are only available to authenticated admins

## How to Use

### For Admins:

1. **Navigate to Product Edit Page**
   - Go to a product detail page
   - Click the "Edit Product" button (appears for admins only)

2. **Add Image via URL**
   - Click the "Image URL" tab
   - Paste the full URL of the image
   - (Optional) Add alt text description
   - Click "Download & Add Image"
   - Wait for server to download and store the image

3. **Add Image via File Upload**
   - Click the "Upload File" tab
   - Click to select an image file from your computer
   - (Optional) Add alt text description
   - Click "Upload & Add Image"
   - File is uploaded and stored on server

4. **Manage Images**
   - View all product images in the list below
   - Edit position order and alt text
   - Set an image as primary
   - Delete unwanted images

### For Developers:

1. **Build Production Bundle**
   ```bash
   npm run build
   ```

2. **Build SSR Server Bundle**
   ```bash
   npm run build:server
   ```

3. **Run SSR Server**
   ```bash
   npm run serve:ssr
   ```
   Server will run on `http://localhost:4000`

4. **Development Mode**
   ```bash
   npm start
   ```
   Development server runs on `http://localhost:4200`

## Error Handling

The system provides user-friendly error messages:

- **URL Validation**: "Invalid URL format"
- **Download Failure**: "Failed to download image from URL. Please check the URL and try again."
- **File Selection**: "Please select a valid image file"
- **Upload Failure**: "Failed to upload image. Please try again."
- **Server Errors**: Specific error messages from server responses

## Testing Checklist

- [ ] Admin can navigate to product edit page
- [ ] Tab switching works between URL and File modes
- [ ] Can input external image URL
- [ ] Server successfully downloads image from URL
- [ ] Downloaded image appears in products gallery
- [ ] Can select file from computer
- [ ] File uploads successfully to server
- [ ] Uploaded image appears in products gallery
- [ ] Images can be reordered
- [ ] Alt text can be edited
- [ ] Images can be set as primary
- [ ] Images can be deleted
- [ ] Error messages display correctly for invalid inputs
- [ ] Error messages display for network failures

## Performance Considerations

1. **Image Downloads**: External URL downloads may take time depending on:
   - Server's internet connection
   - File size
   - External host response time

2. **File Storage**: All images are stored locally to:
   - Reduce external dependencies
   - Ensure images persist even if external links break
   - Improve page load times
   - Provide backup protection

3. **Database Integration**: The local path is stored in the database for quick retrieval

## Troubleshooting

### Images not appearing after upload
- Check `public/assets/images/products/uploads/` directory exists
- Verify server has write permissions to the directory
- Check browser console for error messages

### Upload fails with timeout
- The remote server is slow or unresponsive
- Try a different image URL or upload directly

### File upload not working
- Check file is a valid image format
- Verify file size is under 10 MB
- Check server logs for detailed error messages

## Future Enhancements

- [ ] Drag-and-drop file upload
- [ ] Multiple file uploads at once (batch)
- [ ] Image cropping/editing before upload
- [ ] Image compression for optimal storage
- [ ] CDN integration for faster delivery
- [ ] Image preview before confirmation
- [ ] Bulk image import from URLs

---

**Last Updated:** January 4, 2026
**Feature Status:** Production Ready

# Test Files for File Processing

This directory contains sample files for testing the Tuutta file processing system.

## Files Included

### Text Files
- `sample.txt` - Plain text with special characters and emojis

### How to Test

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Files panel** in the app

3. **Test each file type:**
   - Drag and drop files into the upload area
   - Verify progress indicators show
   - Wait for extraction to complete
   - Click the eye icon to preview extracted content
   - Verify content matches the original

4. **Test error handling:**
   - Try uploading a file > 50MB (should show error)
   - Try uploading an invalid/corrupted file

## Additional Test Files Needed

For complete testing, you'll need to provide:

- **PDF files** (.pdf) - Both regular and scanned
- **Word documents** (.docx)
- **Excel spreadsheets** (.xlsx)
- **Images with text** (.png, .jpg) - For OCR testing

You can use your own files or download samples from the internet.

## Expected Results

### Text Files
- Should extract 100% of content
- Special characters should be preserved
- Preview should show formatted text

### PDF Files
- Should extract all text
- For scanned PDFs, OCR should activate
- Images may be skipped

### DOCX Files
- Should extract all text content
- Formatting may be lost
- Images are typically skipped

### XLSX Files
- Should extract all sheets
- Cell data should be comma-separated
- Formulas may show as values

### Images
- OCR should extract visible text
- Accuracy depends on image quality
- Handwritten text may not work well

## Troubleshooting

If file processing fails:
1. Check console for error messages
2. Verify file size is < 50MB
3. Ensure file isn't password-protected
4. Try a different file format
5. Check browser compatibility

---

Last updated: 2025-01-06

/**
 * GigWheels - FileUpload Component Tests
 * Weekly car rentals for gig drivers
 *
 * Unit tests for the file upload component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload, UploadedFile, UploadStatus } from '@/components/ui/FileUpload';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
const mockFileReaderResult = 'data:image/jpeg;base64,mockbase64data';
class MockFileReader {
  result: string | null = null;
  onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((e: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    setTimeout(() => {
      this.result = mockFileReaderResult;
      if (this.onload) {
        this.onload({ target: { result: this.result } } as ProgressEvent<FileReader>);
      }
    }, 0);
  }
}
(global as any).FileReader = MockFileReader;

// Helper to create a mock file
const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default content', () => {
      render(<FileUpload onUpload={mockOnUpload} />);

      expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<FileUpload onUpload={mockOnUpload} label="Upload Documents" />);

      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });

    it('should render with hint text', () => {
      render(<FileUpload onUpload={mockOnUpload} hint="Max 10MB per file" />);

      expect(screen.getByText('Max 10MB per file')).toBeInTheDocument();
    });

    it('should render with custom children', () => {
      render(
        <FileUpload onUpload={mockOnUpload}>
          <span data-testid="custom-content">Custom Upload UI</span>
        </FileUpload>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should apply disabled styles when disabled', () => {
      render(<FileUpload onUpload={mockOnUpload} disabled />);

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div');
      expect(dropZone).toHaveClass('cursor-not-allowed', 'opacity-50');
    });
  });

  describe('file selection', () => {
    it('should handle file input change', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      render(<FileUpload onUpload={mockOnUpload} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith([file]);
      });
    });

    it('should handle multiple files when multiple is true', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      render(<FileUpload onUpload={mockOnUpload} multiple />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute('multiple');

      const files = [
        createMockFile('test1.jpg', 1024, 'image/jpeg'),
        createMockFile('test2.jpg', 2048, 'image/jpeg'),
      ];

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(files);
      });
    });
  });

  describe('file validation', () => {
    it('should reject files exceeding max size', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(
        <FileUpload
          onUpload={mockOnUpload}
          validation={{ maxSize: 1000 }}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = createMockFile('large.jpg', 2000, 'image/jpeg');

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        // File should be added but with error status
        expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument();
      });

      alertMock.mockRestore();
    });

    it('should reject files with invalid MIME type', async () => {
      render(
        <FileUpload
          onUpload={mockOnUpload}
          validation={{ acceptedTypes: ['image/jpeg'] }}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = createMockFile('document.pdf', 1024, 'application/pdf');

      fireEvent.change(input, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file type.*is not accepted/i)).toBeInTheDocument();
      });
    });

    it('should alert when exceeding max files', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <FileUpload
          onUpload={mockOnUpload}
          validation={{ maxFiles: 1 }}
          multiple
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createMockFile('test1.jpg', 1024, 'image/jpeg'),
        createMockFile('test2.jpg', 1024, 'image/jpeg'),
      ];

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Maximum 1 files allowed');
      });

      alertMock.mockRestore();
    });
  });

  describe('drag and drop', () => {
    it('should show drag state on drag enter', () => {
      render(<FileUpload onUpload={mockOnUpload} />);

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div');

      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { files: [] },
      });

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    });

    it('should remove drag state on drag leave', () => {
      render(<FileUpload onUpload={mockOnUpload} />);

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div');

      fireEvent.dragEnter(dropZone!, { dataTransfer: { files: [] } });
      fireEvent.dragLeave(dropZone!, { dataTransfer: { files: [] } });

      expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
    });

    it('should handle file drop', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      render(<FileUpload onUpload={mockOnUpload} />);

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div');
      const file = createMockFile('dropped.jpg', 1024, 'image/jpeg');

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith([file]);
      });
    });

    it('should not process drop when disabled', async () => {
      render(<FileUpload onUpload={mockOnUpload} disabled />);

      const dropZone = screen.getByText(/drag and drop files here/i).closest('div');
      const file = createMockFile('dropped.jpg', 1024, 'image/jpeg');

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnUpload).not.toHaveBeenCalled();
      });
    });
  });

  describe('file list', () => {
    it('should display uploaded files', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('test.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 100,
          status: 'success' as UploadStatus,
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
        />
      );

      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });

    it('should show error state for failed uploads', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('failed.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 0,
          status: 'error' as UploadStatus,
          error: 'Upload failed',
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
        />
      );

      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    it('should show progress for uploading files', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('uploading.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 50,
          status: 'uploading' as UploadStatus,
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
        />
      );

      // Progress bar should be visible
      const progressBar = document.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should call onFilesChange when removing a file', () => {
      const mockOnFilesChange = jest.fn();
      const files: UploadedFile[] = [
        {
          file: createMockFile('test.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 100,
          status: 'success' as UploadStatus,
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={mockOnFilesChange}
        />
      );

      const removeButton = screen.getByLabelText('Remove file');
      fireEvent.click(removeButton);

      expect(mockOnFilesChange).toHaveBeenCalledWith([]);
    });
  });

  describe('controlled mode', () => {
    it('should work in controlled mode with external files state', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('external.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 100,
          status: 'success' as UploadStatus,
        },
      ];

      const { rerender } = render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
        />
      );

      expect(screen.getByText('external.jpg')).toBeInTheDocument();

      // Update files externally
      rerender(
        <FileUpload
          onUpload={mockOnUpload}
          files={[]}
          onFilesChange={() => {}}
        />
      );

      expect(screen.queryByText('external.jpg')).not.toBeInTheDocument();
    });
  });

  describe('preview', () => {
    it('should show image preview when showPreview is true', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('image.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 100,
          status: 'success' as UploadStatus,
          preview: 'data:image/jpeg;base64,mockdata',
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
          showPreview
        />
      );

      const preview = screen.getByAltText('image.jpg');
      expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,mockdata');
    });

    it('should show icon instead of preview when showPreview is false', () => {
      const files: UploadedFile[] = [
        {
          file: createMockFile('image.jpg', 1024, 'image/jpeg'),
          id: '1',
          progress: 100,
          status: 'success' as UploadStatus,
          preview: 'data:image/jpeg;base64,mockdata',
        },
      ];

      render(
        <FileUpload
          onUpload={mockOnUpload}
          files={files}
          onFilesChange={() => {}}
          showPreview={false}
        />
      );

      expect(screen.queryByAltText('image.jpg')).not.toBeInTheDocument();
    });
  });
});

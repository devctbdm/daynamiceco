'use client'

import { useCallback, useState } from 'react'
import { Upload, X, Star, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ImageUploaderProps {
  value: string[]
  onChange: (images: string[]) => void
  files?: File[]
  onFilesChange?: (files: File[]) => void
}

export function ImageUploader({ value, onChange, files = [], onFilesChange }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }, [])

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const processFiles = (newFiles: File[]) => {
    setError(null)
    
    const imageFiles = newFiles.filter(file => ALLOWED_TYPES.includes(file.type))
    
    if (imageFiles.length === 0) {
      setError('Only JPG, PNG, GIF, and WebP images are allowed')
      return
    }

    if (imageFiles.length > 10) {
      setError('Maximum 10 images allowed')
      return
    }

    const newUrls = imageFiles.map(file => URL.createObjectURL(file))
    onChange([...value, ...newUrls])
    onFilesChange?.([...files, ...imageFiles])
  }

  const removeImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)
    onFilesChange?.(files.filter((_, i) => i !== index))
  }

  const setAsMain = (index: number) => {
    if (index === 0) return
    const newImages = [...value]
    const [mainImage] = newImages.splice(index, 1)
    newImages.unshift(mainImage)
    onChange(newImages)
    const newFiles = [...files]
    const [movedFile] = newFiles.splice(index, 1)
    newFiles.unshift(movedFile)
    onFilesChange?.(newFiles)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length) return
    const newImages = [...value]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    onChange(newImages)
    const newFiles = [...files]
    const [movedFile] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, movedFile)
    onFilesChange?.(newFiles)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Product Images</label>
        <p className="text-xs text-muted-foreground mt-1">
          Upload multiple images. The first image will be the main product image shown in listings.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-gray-400" />
          <p className="text-sm text-gray-600">
            Drag & drop images here, or click to select
          </p>
          <p className="text-xs text-gray-400">
            JPG, PNG, GIF, WebP up to 5MB each (max 10 images)
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {value.map((image, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={image}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Main Image Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Main
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAsMain(index)}
                      className="h-8 px-2"
                      title="Set as main image"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => moveImage(index, index - 1)}
                      className="h-8 px-2"
                      title="Move left"
                    >
                      ←
                    </Button>
                  )}
                  {index < value.length - 1 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => moveImage(index, index + 1)}
                      className="h-8 px-2"
                      title="Move right"
                    >
                      →
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                    className="h-8 px-2"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <div className="flex items-center justify-center p-8 border border-dashed rounded-lg text-gray-400">
          <div className="text-center space-y-2">
            <ImageIcon className="h-8 w-8 mx-auto" />
            <p className="text-sm">No images uploaded yet</p>
          </div>
        </div>
      )}
    </div>
  )
}

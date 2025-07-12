import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface UploadedMediaPreviewProps {
	post: any; // Using any for now to avoid complex type issues
	activeTab: string;
}

export const UploadedMediaPreview = ({ post, activeTab }: UploadedMediaPreviewProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	
	// Get media from the Jazz post object
	const media = post.variants[activeTab]?.media || [];
	const mediaArray = Array.from(media);

	const removeMedia = (index: number) => {
		const mediaToRemove = mediaArray[index];
		if (mediaToRemove && media) {
			// Remove from Jazz collaborative list
			const mediaIndex = media.findIndex((item: any) => item === mediaToRemove);
			if (mediaIndex !== -1) {
				media.splice(mediaIndex, 1);
			}
			
			// Adjust current index if needed
			if (currentIndex >= mediaArray.length - 1) {
				setCurrentIndex(Math.max(0, mediaArray.length - 2));
			}
		}
	};

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? mediaArray.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === mediaArray.length - 1 ? 0 : prevIndex + 1));
	};

	if (mediaArray.length === 0) return null;

	return (
		<div className="relative max-w-lg mx-auto">
			<div className="overflow-hidden rounded-lg shadow-md">
				<div
					className="flex transition-transform duration-300 ease-in-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{mediaArray.map((mediaItem: any, index) => (
						<div key={index} className="flex-shrink-0 w-full relative">
							{(() => {
								// Debug logging to see what we actually have
								console.log('MediaItem debug:', {
									type: mediaItem?.type,
									hasImage: !!mediaItem?.image,
									imageKeys: mediaItem?.image ? Object.keys(mediaItem.image) : [],
									imageProps: mediaItem?.image ? {
										// FileStream properties
										id: mediaItem.image.id,
										mimeType: mediaItem.image.mimeType,
										totalSize: mediaItem.image.totalSize,
										// Check all available properties and methods
										allProps: Object.getOwnPropertyNames(mediaItem.image),
										allKeys: Object.keys(mediaItem.image),
										// Check prototype methods
										prototypeMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(mediaItem.image)),
										// Try calling potential methods
										createObjectURL: typeof mediaItem.image.createObjectURL === 'function',
										getBlob: typeof mediaItem.image.getBlob === 'function',
										toBlob: typeof mediaItem.image.toBlob === 'function',
										asBlob: typeof mediaItem.image.asBlob === 'function',
										getBlobURL: typeof mediaItem.image.getBlobURL === 'function',
										toString: mediaItem.image.toString ? mediaItem.image.toString() : 'no toString',
										// Try to access _raw property
										hasRaw: !!mediaItem.image._raw,
										rawType: typeof mediaItem.image._raw,
										rawKeys: mediaItem.image._raw ? Object.keys(mediaItem.image._raw) : [],
									} : null
								});

								if (mediaItem?.type === 'image' && mediaItem.image) {
									// Try different methods to get image URL from FileStream
									let imageUrl = null;
									
									try {
										// Try various methods that might exist on FileStream
										if (typeof mediaItem.image.createObjectURL === 'function') {
											imageUrl = mediaItem.image.createObjectURL();
										} else if (typeof mediaItem.image.getBlob === 'function') {
											const blob = mediaItem.image.getBlob();
											if (blob) imageUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.image.toBlob === 'function') {
											const blob = mediaItem.image.toBlob();
											if (blob) imageUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.image.asBlob === 'function') {
											const blob = mediaItem.image.asBlob();
											if (blob) imageUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.image.getBlobURL === 'function') {
											imageUrl = mediaItem.image.getBlobURL();
										} else if (mediaItem.image.toString && mediaItem.image.toString() !== '[object Object]') {
											// If toString returns something useful, try using it as URL
											const stringValue = mediaItem.image.toString();
											if (stringValue.startsWith('blob:') || stringValue.startsWith('data:') || stringValue.startsWith('http')) {
												imageUrl = stringValue;
											}
										}
									} catch (error) {
										console.error('Error getting image URL:', error);
									}
									
									console.log('🖼️ UploadedMediaPreview - Image URL detection result:', {
										imageUrl,
										availableMethods: {
											createObjectURL: typeof mediaItem.image.createObjectURL,
											getBlob: typeof mediaItem.image.getBlob,
											toBlob: typeof mediaItem.image.toBlob,
											asBlob: typeof mediaItem.image.asBlob,
											getBlobURL: typeof mediaItem.image.getBlobURL,
										}
									});

									if (imageUrl) {
										return (
											<Image
												src={imageUrl}
												alt={mediaItem.alt?.toString() || "uploaded image"}
												width={500}
												height={500}
												className="rounded-lg shadow-md w-full object-cover"
												onError={(e) => {
													console.error('Image failed to load:', e);
													(e.target as HTMLImageElement).src = "/placeholder-image.jpg";
												}}
											/>
										);
									} else {
										return (
											<div className="w-full h-[500px] bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
												<div className="text-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
													<p className="text-gray-500 text-sm">Processing image...</p>
													<p className="text-xs text-gray-400 mt-1">Available properties: {Object.keys(mediaItem.image).join(', ')}</p>
												</div>
											</div>
										);
									}
								} else if (mediaItem?.type === 'video' && mediaItem.video) {
									// Try different methods to get video URL from FileStream
									let videoUrl = null;
									
									try {
										// Try various methods that might exist on FileStream
										if (typeof mediaItem.video.createObjectURL === 'function') {
											videoUrl = mediaItem.video.createObjectURL();
										} else if (typeof mediaItem.video.getBlob === 'function') {
											const blob = mediaItem.video.getBlob();
											if (blob) videoUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.video.toBlob === 'function') {
											const blob = mediaItem.video.toBlob();
											if (blob) videoUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.video.asBlob === 'function') {
											const blob = mediaItem.video.asBlob();
											if (blob) videoUrl = URL.createObjectURL(blob);
										} else if (typeof mediaItem.video.getBlobURL === 'function') {
											videoUrl = mediaItem.video.getBlobURL();
										}
									} catch (error) {
										console.error('Error getting video URL:', error);
									}

									if (videoUrl) {
										return (
											<video
												src={videoUrl}
												controls
												className="w-full max-w-lg rounded-lg shadow-md"
												onError={(e) => console.error('Video failed to load:', e)}
											/>
										);
									} else {
										return (
											<div className="w-full h-[300px] bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
												<div className="text-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
													<p className="text-gray-500 text-sm">Processing video...</p>
													<p className="text-xs text-gray-400 mt-1">Available properties: {Object.keys(mediaItem.video).join(', ')}</p>
												</div>
											</div>
										);
									}
								} else {
									return (
										<div className="w-full h-[500px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
											<div className="text-center">
												<p className="text-gray-400">Media not available</p>
												<p className="text-xs text-gray-300 mt-1">Type: {mediaItem?.type || 'unknown'}</p>
												<p className="text-xs text-gray-300">Has image: {!!mediaItem?.image ? 'yes' : 'no'}</p>
												<p className="text-xs text-gray-300">Has video: {!!mediaItem?.video ? 'yes' : 'no'}</p>
											</div>
										</div>
									);
								}
							})()}
							<Button
								variant="soft"
								size="1"
								onClick={() => removeMedia(index)}
								className="absolute top-2 right-2 !rounded-full !w-8 !h-8 bg-red-500 hover:bg-red-600 text-white"
							>
								<X className="w-4 h-4" />
							</Button>
						</div>
					))}
				</div>
			</div>

			{mediaArray.length > 1 && (
				<>
					<Button
						variant="soft"
						size="1"
						onClick={handlePrev}
						className="absolute top-1/2 left-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="soft"
						size="1"
						onClick={handleNext}
						className="absolute top-1/2 right-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
						{mediaArray.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-gray-400'}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}; 
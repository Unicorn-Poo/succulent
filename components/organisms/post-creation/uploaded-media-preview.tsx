import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Extend Window interface to include tempUploads
declare global {
	interface Window {
		tempUploads: UploadedFile[];
	}
}

interface UploadedFile {
	type: 'image' | 'video';
	objectUrl: string;
	file: File;
	alt: string;
	postId: string;
	variant: string;
	timestamp: number;
	fileName: string;
	fileType: string;
}

interface UploadedMediaPreviewProps {
	postId: string;
	variant: string;
}

export const UploadedMediaPreview = ({ postId, variant }: UploadedMediaPreviewProps) => {
	const [uploads, setUploads] = useState<UploadedFile[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		const loadUploads = () => {
			const allUploads = window.tempUploads || [];
			console.log('📄 All uploads from window.tempUploads:', allUploads);
			
			const filteredUploads = allUploads.filter((upload: UploadedFile) => 
				upload.postId === postId && upload.variant === variant
			);
			console.log('📄 Filtered uploads for this post/variant:', filteredUploads);
			setUploads(filteredUploads);
		};

		loadUploads();
		
		// Listen for storage changes
		const handleStorageChange = () => loadUploads();
		window.addEventListener('storage', handleStorageChange);
		
		// Also listen for a custom event we'll dispatch
		window.addEventListener('temp-uploads-changed', handleStorageChange);
		
		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('temp-uploads-changed', handleStorageChange);
		};
	}, [postId, variant]);

	const removeUpload = (index: number) => {
		const uploadToRemove = uploads[index];
		
		// Clean up object URL to prevent memory leaks
		URL.revokeObjectURL(uploadToRemove.objectUrl);
		
		// Remove from window.tempUploads
		if (window.tempUploads) {
			window.tempUploads = window.tempUploads.filter(upload => 
				upload.timestamp !== uploadToRemove.timestamp
			);
		}
		
		setUploads(uploads.filter((_, i) => i !== index));
		if (currentIndex >= uploads.length - 1) {
			setCurrentIndex(Math.max(0, uploads.length - 2));
		}
	};

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? uploads.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === uploads.length - 1 ? 0 : prevIndex + 1));
	};

	if (uploads.length === 0) return null;

	return (
		<div className="relative max-w-lg mx-auto">
			<div className="overflow-hidden rounded-lg shadow-md">
				<div
					className="flex transition-transform duration-300 ease-in-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{uploads.map((upload, index) => (
						<div key={index} className="flex-shrink-0 w-full relative">
							{upload.type === 'image' && (
								<Image
									src={upload.objectUrl}
									alt={upload.alt ?? "uploaded image"}
									width={500}
									height={500}
									className="rounded-lg shadow-md w-full object-cover"
								/>
							)}
							{upload.type === 'video' && (
								<video
									src={upload.objectUrl}
									controls
									className="w-full max-w-lg rounded-lg shadow-md"
								/>
							)}
							<Button
								variant="soft"
								size="1"
								onClick={() => removeUpload(index)}
								className="absolute top-2 right-2 !rounded-full !w-8 !h-8 bg-red-500 hover:bg-red-600 text-white"
							>
								<X className="w-4 h-4" />
							</Button>
						</div>
					))}
				</div>
			</div>

			{uploads.length > 1 && (
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
						{uploads.map((_, index) => (
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
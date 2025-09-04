import { useState, useRef } from "react";
import { Button } from "@radix-ui/themes";
import { Plus, Upload, Image as ImageIcon, FileText, Camera, Film } from "lucide-react";
import { UploadedMediaPreview } from "./uploaded-media-preview";
import { PostFullyLoaded } from "@/app/schema";

interface PostContentProps {
	seriesType: "reply" | null;
	post: PostFullyLoaded;
	activeTab: string;
	handleImageUpload: () => void;
	contextText: string | null;
	handleContentChange: (content: string) => void;
	hasUnsavedChanges: boolean;
	showSaveButton: boolean;
	handleSaveContent: () => void;
	isSaving: boolean;
	isImplicitThread: boolean;
	isExplicitThread: boolean;
}

export const PostContent = ({
	seriesType,
	post,
	activeTab,
	handleImageUpload,
	contextText,
	handleContentChange,
	hasUnsavedChanges,
	showSaveButton,
	handleSaveContent,
	isSaving,
	isImplicitThread,
	isExplicitThread,
}: PostContentProps) => {
	const [isDragOver, setIsDragOver] = useState(false);
	const [dragCounter, setDragCounter] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		setDragCounter(prev => prev + 1);
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setDragCounter(prev => prev - 1);
		if (dragCounter === 1) {
			setIsDragOver(false);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		setDragCounter(0);
		
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			// Handle file upload logic here
			handleImageUpload();
		}
	};

	const hasMedia = (post.variants[activeTab]?.media && post.variants[activeTab]!.media!.length > 0) ||
	                 (post.variants.base?.media && post.variants.base!.media!.length > 0);

	return (
		<div className="space-y-6">
			{/* Media Section */}
			{seriesType !== "reply" && (
				<div className="space-y-4">
					{hasMedia ? (
						<div className="relative">
							<UploadedMediaPreview 
								post={post}
								activeTab={activeTab}
								handleImageUpload={handleImageUpload}
							/>
						</div>
					) : (
						<div
							className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
								isDragOver 
									? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20 scale-105' 
									: 'border-gray-300 dark:border-gray-600 hover:border-lime-400 dark:hover:border-lime-500'
							}`}
							onDragEnter={handleDragEnter}
							onDragLeave={handleDragLeave}
							onDragOver={handleDragOver}
							onDrop={handleDrop}
						>
							<div className="text-center">
								<div className={`mx-auto mb-4 transition-all duration-300 ${
									isDragOver ? 'scale-110' : ''
								}`}>
									<div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-lime-100 to-green-100 dark:from-lime-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center">
										{isDragOver ? (
											<Upload className="w-10 h-10 text-lime-600 dark:text-lime-400 animate-bounce" />
										) : (
											<ImageIcon className="w-10 h-10 text-lime-600 dark:text-lime-400" />
										)}
									</div>
								</div>
								
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
									{isDragOver ? 'Drop your media here' : 'Add Media to Your Post'}
								</h3>
								
								<p className="text-gray-600 dark:text-gray-400 mb-6">
									{isDragOver 
										? 'Release to upload your files' 
										: 'Drag & drop images or videos, or click to browse'
									}
								</p>

								<div className="space-y-4">
									<Button
										variant="solid"
										size="3"
										onClick={handleImageUpload}
										className="bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
									>
										<Plus className="w-5 h-5 mr-2" />
										Choose Files
									</Button>

									<div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
										<div className="flex items-center">
											<ImageIcon className="w-4 h-4 mr-1" />
											Images
										</div>
										<div className="flex items-center">
											<Film className="w-4 h-4 mr-1" />
											Videos
										</div>
										<div className="flex items-center">
											<Camera className="w-4 h-4 mr-1" />
											GIFs
										</div>
									</div>
								</div>
							</div>

							{/* Drag overlay */}
							{isDragOver && (
								<div className="absolute inset-0 bg-lime-500/10 border-2 border-lime-500 rounded-2xl flex items-center justify-center">
									<div className="text-center">
										<Upload className="w-12 h-12 text-lime-600 dark:text-lime-400 mx-auto mb-2 animate-bounce" />
										<p className="text-lime-700 dark:text-lime-300 font-medium">Drop files to upload</p>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Content Editor */}
			<div className="space-y-4">
				<div className="relative">
					<textarea
						ref={textareaRef}
						value={contextText || post.variants[activeTab]?.text?.toString() || ""}
						onChange={(e) => handleContentChange(e.target.value)}
						placeholder={`What's happening? Use double line breaks for threads.`}
						className="w-full min-h-[150px] p-4 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
						rows={6}
					/>
					
					{/* Character count and thread indicator */}
					<div className="absolute bottom-3 right-3 flex items-center space-x-2">
						{(isImplicitThread || isExplicitThread) && (
							<div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
								<FileText className="w-3 h-3 mr-1" />
								Thread
							</div>
						)}
						<div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
							{(contextText || post.variants[activeTab]?.text?.toString() || "").length}
						</div>
					</div>
				</div>

				{/* Save button */}
				{showSaveButton && (
					<div className="flex justify-end">
						<Button
							variant="solid"
							size="2"
							onClick={handleSaveContent}
							disabled={isSaving}
							className="bg-lime-500 hover:bg-lime-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
						>
							{isSaving ? (
								<>
									<div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									Saving...
								</>
							) : (
								<>
									<Plus className="w-4 h-4 mr-2" />
									Save Content
								</>
							)}
						</Button>
					</div>
				)}
			</div>

			{/* Don't show edited badge on base component */}
			{seriesType !== 'reply' && activeTab !== "base" && post.variants[activeTab]?.edited && (
				<div className="flex items-center justify-center">
					<div className="flex items-center bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm">
						<div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
						This version has been edited
					</div>
				</div>
			)}
		</div>
	);
}; 
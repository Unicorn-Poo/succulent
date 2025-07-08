import { useState, useEffect, useCallback, useMemo } from 'react';
import { validateReplyUrl, detectPlatformFromUrl } from './postValidation';
import { generateThreadPreview, ThreadPost } from './threadUtils';

/**
 * Custom hook for managing reply URL validation
 */
export const useReplyUrl = (url: string) => {
	const isValid = useMemo(() => 
		url ? validateReplyUrl(url) : false, 
		[url]
	);

	const detectedPlatform = useMemo(() => 
		url ? detectPlatformFromUrl(url) : null, 
		[url]
	);

	return { isValid, detectedPlatform };
};

/**
 * Custom hook for managing thread preview generation
 */
export const useThreadPreview = (seriesType: string | null, activeTab: string) => {
	const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([]);

	const updateThreadPreview = useCallback((text: string) => {
		if (seriesType === "multi" && text) {
			const threads = generateThreadPreview(text, activeTab);
			setThreadPosts(threads);
		} else {
			setThreadPosts([]);
		}
	}, [seriesType, activeTab]);

	return { threadPosts, updateThreadPreview };
};

/**
 * Custom hook for managing selected platforms
 */
export const useSelectedPlatforms = (initialPlatforms: string[]) => {
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms);

	const addPlatform = useCallback((platform: string) => {
		if (!selectedPlatforms.includes(platform)) {
			setSelectedPlatforms(prev => [...prev, platform]);
		}
	}, [selectedPlatforms]);

	const removePlatform = useCallback((platform: string) => {
		setSelectedPlatforms(prev => prev.filter(p => p !== platform));
	}, []);

	return { 
		selectedPlatforms, 
		setSelectedPlatforms, 
		addPlatform, 
		removePlatform 
	};
};

/**
 * Custom hook for managing post content and edits
 */
export const usePostContent = (initialText: string = "") => {
	const [content, setContent] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	const updateContent = useCallback((newContent: string) => {
		setContent(newContent);
		setHasChanges(true);
	}, []);

	const resetContent = useCallback(() => {
		setContent(null);
		setHasChanges(false);
	}, []);

	const getCurrentContent = useCallback(() => {
		return content || initialText;
	}, [content, initialText]);

	return {
		content,
		hasChanges,
		updateContent,
		resetContent,
		getCurrentContent
	};
};

/**
 * Custom hook for managing async operations with loading and error states
 */
export const useAsyncOperation = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [success, setSuccess] = useState("");

	const executeOperation = useCallback(async (operation: () => Promise<any>) => {
		setIsLoading(true);
		setErrors([]);
		setSuccess("");

		try {
			const result = await operation();
			setSuccess("Operation completed successfully!");
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An error occurred';
			setErrors([errorMessage]);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const clearMessages = useCallback(() => {
		setErrors([]);
		setSuccess("");
	}, []);

	return {
		isLoading,
		errors,
		success,
		executeOperation,
		clearMessages
	};
};

/**
 * Custom hook for managing form state with validation
 */
export const useFormValidation = <T extends Record<string, any>>(
	initialValues: T,
	validationRules: Record<keyof T, (value: any) => string | null>
) => {
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
	const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

	const setValue = useCallback((field: keyof T, value: any) => {
		setValues(prev => ({ ...prev, [field]: value }));
		
		// Validate the field
		const error = validationRules[field]?.(value);
		setErrors(prev => ({ ...prev, [field]: error || undefined }));
	}, [validationRules]);

	const markAsTouched = useCallback((field: keyof T) => {
		setTouched(prev => ({ ...prev, [field]: true }));
	}, []);

	const isValid = useMemo(() => {
		return Object.values(errors).every(error => !error);
	}, [errors]);

	const reset = useCallback(() => {
		setValues(initialValues);
		setErrors({});
		setTouched({});
	}, [initialValues]);

	return {
		values,
		errors,
		touched,
		isValid,
		setValue,
		markAsTouched,
		reset
	};
}; 
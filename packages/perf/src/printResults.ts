export function generatePerformanceOutput(currentDownloadSpeed: number, previousDownloadSpeed: number,  currentUploadSpeed: number, previousUploadSpeed: number): string {

  const uploadProgress = (currentUploadSpeed - previousUploadSpeed) / previousUploadSpeed;
  const downloadProgress = (currentDownloadSpeed - previousDownloadSpeed) / previousDownloadSpeed;

  let markdownContent = `
	# Bandwidth Test Results

	## Download Bandwidth

	The download bandwidth measured during the test was: ${currentDownloadSpeed} kiB/s.

	`;

	if (downloadProgress > 0) {
		markdownContent += `:white_check_mark: The download bandwidth has improved by ${downloadProgress}% since the last test. :white_check_mark:`;
	} else if (downloadProgress < 0) {
		markdownContent += `:x: The download bandwidth has decreased by ${downloadProgress}% since the last test. :x:`;
	} else {
		markdownContent += `The download bandwidth has not changed since the last test.`;
	}

	markdownContent += `

	## Upload Bandwidth

	The upload bandwidth measured during the test was: ${currentUploadSpeed} kiB/s.
	`;

	if (uploadProgress > 0) {
		markdownContent += `:white_check_mark: The upload bandwidth has improved by ${uploadProgress}% since the last test. :white_check_mark:`;
	} else if (uploadProgress < 0) {
		markdownContent += `:x: The upload bandwidth has decreased by ${uploadProgress}% since the last test. :x:`;
	} else {
		markdownContent += `The upload bandwidth has not changed since the last test.`;
	}

	return markdownContent.replace(/\t/g, '');

}


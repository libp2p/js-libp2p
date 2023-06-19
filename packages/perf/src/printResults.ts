export function generatePerformanceOutput(currentDownloadSpeed: number, previousDownloadSpeed: number,  currentUploadSpeed: number, previousUploadSpeed: number): string {

  const uploadProgress = (currentUploadSpeed - previousUploadSpeed) / previousUploadSpeed;
  const downloadProgress = (currentDownloadSpeed - previousDownloadSpeed) / previousDownloadSpeed;

  let markdownContent = `
	# Bandwidth Test Results

	## Download Bandwidth

	The download bandwidth measured during the test was: ${currentDownloadSpeed} kiB/s.

	`;

	if (downloadProgress > 0) {
		markdownContent += `<span style="color:green;"> The download bandwidth has improved by ${downloadProgress}% since the last test. </span>`;
	} else if (uploadProgress < 0) {
		markdownContent += `<span style="color:red;"> The download bandwidth has decreased by ${downloadProgress}% since the last test. </span>`;
	} else {
		markdownContent += `The download bandwidth has not changed since the last test.`;
	}

	`
	## Upload Bandwidth

	The upload bandwidth measured during the test was: ${currentUploadSpeed} kiB/s.
	`;

	if (uploadProgress > 0) {
		markdownContent += `<span style="color:green;">The upload bandwidth has improved by ${uploadProgress}% since the last test. </span>`;
	} else if (uploadProgress < 0) {
		markdownContent += `The upload bandwidth has decreased by ${uploadProgress}% since the last test.`;
	} else {
		markdownContent += `<span style="color:red;"> The upload bandwidth has not changed since the last test.  </span>`;
	}


	return markdownContent;

}


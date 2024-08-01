const fs = require("fs");

// Function to read a markdown file and extract title and content
function readMarkdown(filePath) {
  try {
    // Read the markdown file
    const markdownContent = fs.readFileSync(filePath, "utf-8");

    // Extract the title (assuming the first section header is the title)
    const titleMatch = markdownContent.match(/^# (.+)$|^(.+)\n=+$/m);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'Untitled';

    return {
      title,
      content: markdownContent,
    };
  } catch (err) {
    console.error("Error reading markdown file:", err);
    return null;
  }
}

module.exports = {
  readMarkdown,
};

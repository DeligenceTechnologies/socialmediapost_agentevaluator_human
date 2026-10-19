import OpenAI from "openai";

/**
 * Generates an image using DALL-E 3
 * @param {string} prompt - The prompt for image generation
 * @returns {Promise<string>} - URL of the generated image
 */
export async function generateImage(prompt) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("A valid prompt string is required");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    console.log("Image Generation: Starting with prompt:", prompt);

    // Initialize OpenAI client with API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("Image Generation: Making API request...");
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "vivid",
    });

    console.log(
      "Image Generation: Received API response:",
      JSON.stringify(response, null, 2)
    );

    if (!response.data || !response.data[0] || !response.data[0].url) {
      console.error(
        "Image Generation: Invalid response from OpenAI:",
        response
      );
      throw new Error("Invalid response from OpenAI API");
    }

    const imageUrl = response.data[0].url;
    console.log(
      "Image Generation: Successfully generated image URL:",
      imageUrl
    );
    return imageUrl;
  } catch (error) {
    console.error("Image Generation Error:", error);
    if (error.response) {
      console.error("OpenAI API Error Details:", error.response.data);
    }
    throw error;
  }
}

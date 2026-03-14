import { AIStrategy } from "./ai.strategy";

export class OpenAIStrategy implements AIStrategy {
  private readonly apiUrl = "https://api.openai.com/v1/chat/completions";
  private apiKey: string;

  constructor(apiKey: string = process.env.OPENAI_API_KEY || "") {
    this.apiKey = apiKey;
  }

  async prompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API Key is missing. Please check your environment variables.",
      );
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API Error: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}

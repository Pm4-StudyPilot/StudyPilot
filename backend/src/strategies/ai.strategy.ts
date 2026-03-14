export interface AIStrategy {
  prompt(prompt: string): Promise<string>;
}

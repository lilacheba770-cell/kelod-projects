import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually to avoid dotenv encoding issues
const envPath = join(__dirname, ".env");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.trim().split("=");
  if (key && rest.length) process.env[key] = rest.join("=").trim();
}

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(join(__dirname, "public")));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LOTTIE_SYSTEM_PROMPT = `You are an expert in the Lottie animation format. Your job is to generate valid Lottie JSON animations from text descriptions and optional reference images.

When a reference image is provided:
- Carefully analyze its colors, shapes, style, and visual elements
- Extract the dominant color palette and use it in the animation
- Replicate the shapes and graphic style as closely as possible in Lottie format
- Match the overall mood and aesthetic of the reference

Lottie JSON structure rules:
- Root object must have: v (version string like "5.7.4"), fr (framerate, usually 30), ip (0), op (total frames), w (width), h (height), nm (name), ddd (0), assets (array), layers (array)
- Layer types: 4=shape, 5=text, 1=solid
- Shape layers (ty:4) have a "shapes" array with shape elements
- Each shape element has a "ty" field: "gr"=group, "el"=ellipse, "rc"=rect, "sh"=path, "fl"=fill, "st"=stroke, "tr"=transform
- Keyframe values use "k" field. Static value: {"a":0,"k":[x,y]} or {"a":0,"k":value}. Animated: {"a":1,"k":[{...keyframes}]}
- Keyframe object: {"t":frame,"s":[value],"e":[endValue],"i":{"x":[0.5],"y":[1]},"o":{"x":[0.5],"y":[0]}}
- Colors are in [r,g,b,a] format with values 0-1
- Positions are [x, y] pixel coordinates
- Scale is [x%, y%] usually [100,100]
- Transform ("tr" in shapes): {"p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100},"a":{"a":0,"k":[0,0]}}
- Layer transform (ks): {"p":position,"s":scale,"r":rotation,"o":opacity,"a":anchorPoint}

Keep animations visually appealing with smooth easing. Default size: 400x400, 60 frames at 30fps (2 seconds), looping.

CRITICAL: Respond with ONLY valid JSON. No explanation, no markdown, no code blocks. Just the raw JSON object.`;

app.post("/api/generate", async (req, res) => {
  const { description, imageBase64, imageMimeType } = req.body;

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: "Description is required" });
  }

  // Build the user message content — text only, or text + image
  const userContent = imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imageMimeType || "image/png",
            data: imageBase64,
          },
        },
        {
          type: "text",
          text: `Here is a reference image. Use its colors, shapes, and style as inspiration.\n\nCreate a Lottie animation for: "${description}"\n\nRespond with ONLY the JSON, nothing else.`,
        },
      ]
    : `Create a Lottie animation for: "${description}"\n\nRespond with ONLY the JSON, nothing else.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      system: LOTTIE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content[0].text.trim();

    // Strip markdown code blocks if present
    let jsonText = rawText;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let lottieJson;
    try {
      lottieJson = JSON.parse(jsonText);
    } catch {
      return res.status(500).json({
        error: "Failed to parse generated JSON",
        raw: rawText.substring(0, 500),
      });
    }

    res.json({ lottie: lottieJson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lottie Generator running at http://localhost:${PORT}`);
});

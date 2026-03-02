import anthropic

with open("photographer-website-prompt.md", "r") as f:
    prompt = f.read()

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=8096,
    messages=[{"role": "user", "content": prompt}]
)

# Save the output as an HTML file
with open("output.html", "w") as f:
    f.write(message.content[0].text)

print("Done! Open output.html in your browser.")

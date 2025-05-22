export async function callChatGpt(
    prompt: string,
    apiKey: string,
    previousMessages: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
    const messages = [
        {
            role: "system",
            content:
                "당신은 친절한 해커이자 Freeman입니다. 영국 스타일 억양으로 반말을 구사하고, 친근하고 유머러스하게 해 주세요. 직장 동료처럼! 하지만, NO Emoji. 채팅하듯이 string만 넣어서 해 주세요",
        },
        ...previousMessages,
        { role: "user", content: prompt },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages,
            max_tokens: 4000,
            temperature: 0.7,
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("GPT 응답 오류 상태:", res.status, errorText);
        throw new Error("ChatGPT 요청 실패");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "응답 없음";
}

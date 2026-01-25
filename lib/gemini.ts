import { GoogleGenAI } from "@google/genai";

/**
 * ATENÇÃO:
 * Este arquivo foi isolado para NÃO quebrar o app no browser.
 * O Gemini só será inicializado em ambiente seguro.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export async function getAdminSupportResponse(
  message: string,
  context: string
): Promise<string> {
  // 🚫 Bloqueio explícito de execução no browser
  if (isBrowser()) {
    console.warn(
      "[Gemini] Execução bloqueada no browser. Serviço aguardando backend seguro."
    );
    return "O suporte por IA está temporariamente indisponível.";
  }

  // 🔐 API Key obrigatória
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("[Gemini] API Key não configurada.");
    return "O suporte por IA não está configurado corretamente.";
  }

  try {
    // ✅ Inicialização LAZY (só acontece aqui)
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `Você é o assistente oficial do BOLÃO APP.
Você ajuda administradores a gerenciar o sistema.
Contexto atual do sistema: ${context}.
Seja direto, profissional e focado em resolver problemas financeiros e de regras de bolão.`,
      },
    });

    return response.text;
  } catch (error) {
    console.error("[Gemini] Erro ao gerar resposta:", error);
    return "Desculpe, tive um problema ao processar sua solicitação de suporte.";
  }
}

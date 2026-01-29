# Audit Financeiro: Fluxo do Dinheiro 💰

Este documento detalha o ciclo de vida do dinheiro dentro do Bolão App, desde o depósito inicial até o saque final, garantindo transparência e segurança.

---

## 🏗️ Resumo da Arquitetura de Saldos

O sistema utiliza **dois saldos separados** para proteger o capital do usuário e da casa:

1.  **Saldo Jogo (`balance`):** Dinheiro depositado. Serve apenas para realizar apostas.
2.  **Saldo Saque (`withdrawable_balance`):** Dinheiro ganho em prêmios. Pode ser sacado ou reinvestido.

---

## 🔄 O Ciclo do Dinheiro

1.  **Entrada (Depósitos)**
    *   **Ação:** Usuário deposita via PIX (Automático ou Manual).
    *   **Gatilho:** `tr_final_deposit_trigger` (Tabela `deposits`).
    *   **Destino:** Crédito no **Saldo Jogo**.
    *   **Registro:** Uma transação do tipo `deposit` é criada no Extrato Geral.

2.  **Uso (Apostas em Bolões)**
    *   **Ação:** Usuário entra em um bolão (`place_bet`).
    *   **Fluxo:** O sistema verifica se há **Saldo Jogo** suficiente.
    *   **Débito:** O valor da `entry_fee` é retirado do **Saldo Jogo**.
    *   **Registro:** Uma transação do tipo `bet_debit` é criada. O status da aposta fica como `pending`.

3.  **Resultado (Encerramento do Bolão)**
    *   **Ação:** Admin encerra o bolão definindo o vencedor (`finish_pool`).
    *   **Cálculo da Casa:**
        *   **Volume Bruto:** Total das apostas.
        *   **Taxa Administrativa (10%):** Fica retida no sistema como lucro da plataforma.
        *   **Prêmio Líquido (90%):** Dividido igualmente entre todos os vencedores.
    *   **Pagamento:** O prêmio é creditado no **Saldo Saque** dos vencedores.
    *   **Registro:** Transações do tipo `winning` são criadas para cada ganhador.

4.  **Saída (Saques)**
    *   **Ação:** Usuário solicita a retirada do prêmio (`withdraw_requests`).
    *   **Validação:** O sistema verifica se há **Saldo Saque** suficiente.
    *   **Aprovação:** Um administrador aprova o saque (`process_withdraw_request`).
    *   **Débito:** O valor é retirado do **Saldo Saque**.
    *   **Registro:** Uma transação do tipo `withdrawal` é criada e o dinheiro sai da plataforma para a conta bancária do usuário.

---

## 🛡️ Camadas de Segurança (Anti-Fraude)

*   **Bloqueio de Saldo (`FOR UPDATE`):** Durante uma aposta ou saque, o saldo do usuário é "congelado" por milissegundos para evitar que ele gaste o mesmo dinheiro duas vezes em cliques simultâneos.
*   **Idempotência:** O sistema verifica se uma transação de depósito já foi processada antes de dar o crédito, evitando duplicidade (Erro corrigido com a Limpeza Nuclear).
*   **Separação Estrita:** Dinheiro de depósito nunca vai para o saldo de saque diretamente, e prêmios nunca são "misturados" com depósitos sem registro.

---

## 📊 Exemplo Prático

> 1. Usuário deposita **R$ 100,00**. (+R$ 100 Saldo Jogo)
> 2. Entra em um bolão de **R$ 50,00**. (-R$ 50 Saldo Jogo)
> 3. O bolão tem 10 participantes (Total R$ 500,00).
> 4. Plataforma retém **R$ 50,00** (10%). Prêmio total: **R$ 450,00**.
> 5. Existem 2 vencedores. Cada um recebe **R$ 225,00**. (+R$ 225 Saldo Saque)
> 6. Usuário solicita saque de **R$ 200,00**. (-R$ 200 Saldo Saque)

---

# Hiratafy

Controle manual de faturamento, custo de produto e investimento em campanhas para e-commerce.

## Fluxo de uso

1. Crie as categorias e os produtos.
2. Configure, em cada produto, o preço de venda, o custo-base e as faixas de custo do fornecedor.
3. Crie os descontos por categoria e suas faixas de quantidade.
4. Cadastre as campanhas.
5. Antes das vendas, informe o orçamento de cada campanha no dia de operação.
6. Registre as vendas e atribua a campanha responsável, quando houver.
7. Complete o gasto real das campanhas quando o fechamento da plataforma estiver disponível.

## Regras financeiras

- Valores monetários são armazenados em centavos de dólar.
- Produtos da mesma categoria somam suas quantidades para alcançar uma faixa de desconto.
- Descontos não acumulam: prevalece o maior percentual elegível.
- O frete grátis usa o subtotal dos produtos antes dos descontos. O frete fixo é adicionado por último.
- A faixa de custo do fornecedor é escolhida pela quantidade daquele produto na venda.
- O gasto real da campanha substitui o orçamento. Enquanto não houver gasto real, o orçamento entra nos relatórios.
- O lucro diário e por campanha é `faturamento - custo de produtos - investimento em campanha`.
- Cada venda guarda um snapshot financeiro para que alterações futuras no catálogo não modifiquem o histórico.

## Desenvolvimento

```bash
composer setup
composer dev
```

O projeto usa Laravel, Inertia, React, TypeScript, Tailwind CSS, shadcn/ui e Pest.

## Qualidade

```bash
composer ci:check
npm run build
```

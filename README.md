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
8. Use o Consolidado para simular o resultado de todas as vendas com um único investimento total em mídia.

## Regras financeiras

- Valores monetários são armazenados em centavos de dólar.
- Produtos da mesma categoria somam suas quantidades para alcançar uma faixa de desconto.
- Descontos não acumulam: prevalece o maior percentual elegível.
- O frete grátis usa o subtotal dos produtos antes dos descontos. O frete fixo é adicionado por último.
- A faixa de custo do fornecedor é escolhida pela quantidade daquele produto na venda.
- O gasto real da campanha substitui o orçamento. Enquanto não houver gasto real, o orçamento entra nos relatórios.
- O lucro diário e por campanha é `faturamento - custo de produtos - investimento em campanha`.
- Cada venda guarda um snapshot financeiro para que alterações futuras no catálogo não modifiquem o histórico.
- O Consolidado ignora campanhas e frete, usando `receita líquida dos produtos - custo dos produtos - investimento total informado`.
- O investimento do Consolidado é apenas visual: não é salvo nem altera os relatórios existentes.

## Desenvolvimento

```bash
composer setup
composer dev
```

O projeto usa Laravel, Inertia, React, TypeScript, Tailwind CSS, shadcn/ui e Pest.

## Compartilhamento temporário

Com o `cloudflared` instalado, execute:

```bash
composer share
```

O comando gera o build, inicia um servidor local isolado e exibe um endereço
HTTPS `trycloudflare.com`. Mantenha o terminal aberto enquanto estiver usando o
link e pressione `Ctrl+C` para encerrar. Confirme com `S` caso o Windows
pergunte se deseja finalizar o arquivo em lotes.

O endereço muda a cada execução. O modo de compartilhamento desativa erros
detalhados, usa cookies seguros, reconhece o HTTPS do túnel e oculta passkeys,
pois elas são vinculadas ao domínio. O cadastro público permanece desabilitado:
somente usuários já cadastrados podem entrar.

O mesmo comando mantém a fila local ativa. Quando a integração Shopify estiver
configurada, ele atualiza automaticamente a URL do webhook e busca pedidos pagos
que possam ter ocorrido enquanto o computador estava desligado.

## Integração com a Shopify

Crie um app para a sua própria loja no Shopify Dev Dashboard, habilite o escopo
`read_orders`, publique a versão e instale o app na loja. Depois, copie o Client
ID e o Client secret para o `.env`:

```env
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
```

No Hiratafy, abra **Shopify** no menu lateral, informe o domínio permanente
`sua-loja.myshopify.com`, escolha a campanha padrão e ative a integração. Na
próxima execução de `composer share`, o webhook `orders/paid` será criado ou
atualizado automaticamente.

Somente o nome e a quantidade de cada produto são importados. Preço, desconto,
frete e custo do fornecedor são calculados pelas regras locais do Hiratafy. Se
um nome não coincidir, o pedido fica em **Requer atenção** até que o produto seja
vinculado na tela da integração.

## Qualidade

```bash
composer ci:check
npm run build
```

# Dots and Boxes — Competição entre Agentes Inteligentes

## Visão Geral

Este projeto implementa uma simulação do jogo **Dots and Boxes**, onde **dois agentes inteligentes competem entre si**.

O objetivo é demonstrar conceitos básicos de **Agentes Inteligentes**, como:

* percepção do ambiente
* tomada de decisão
* interação entre agentes
* maximização de recompensa

A aplicação possui uma interface simples com dois controles:

* **Step** → executa uma jogada
* **Autoplay** → executa o jogo automaticamente

---

# O Jogo

O **Dots and Boxes** é jogado em uma grade de pontos.

Exemplo:

```
•   •   •   •

•   •   •   •

•   •   •   •
```

Cada jogador pode desenhar **uma aresta entre dois pontos adjacentes**.

Quando um jogador completa os **quatro lados de um quadrado**, ele:

* conquista a caixa
* ganha **1 ponto**
* joga novamente

Exemplo:

```
•———•
| P1|
•———•
```

---

# Objetivo do Jogo

Cada agente tenta:

```
maximizar o número de caixas conquistadas
```

O vencedor é o jogador com **maior pontuação ao final da partida**.

---

# Ambiente

O ambiente é o **estado atual do tabuleiro**.

Ele inclui:

* arestas desenhadas
* caixas conquistadas
* pontuação dos jogadores
* jogador atual

Representação conceitual:

```
state = {
  edges,
  boxes,
  currentPlayer,
  scores
}
```

---

# Classificação do Ambiente (IA)

Segundo a classificação clássica de ambientes em IA:

| Propriedade     | Tipo                    |
| --------------- | ----------------------- |
| Observabilidade | totalmente observável   |
| Determinismo    | determinístico          |
| Agentes         | multiagente competitivo |
| Natureza        | sequencial              |
| Espaço          | discreto                |

---

# Espaço de Ações

Em cada turno, um agente escolhe:

```
uma aresta ainda não utilizada
```

A ação altera o estado do tabuleiro.

---

# Recompensa

A função de recompensa é simples:

```
+1 ponto para cada caixa fechada
```

---

# Estrutura dos Agentes

Cada jogador é um **agente autônomo** que segue o ciclo clássico:

```
perceber estado
→ escolher ação
→ executar ação
→ ambiente atualiza
→ receber recompensa
```

---

# Estratégias dos Agentes

Os dois agentes usam **heurísticas diferentes**.

---

## Agente 1 — Greedy

Estratégia determinística.

Regras:

1. **Fechar caixas imediatamente**
2. **Evitar criar caixas para o oponente**
3. Caso contrário, escolher a jogada mais segura

---

## Agente 2 — Heurística com Aleatoriedade

Estratégia mais imprevisível.

Regras:

1. Fechar caixas quando possível
2. Preferir jogadas seguras
3. Quando existirem várias opções boas, escolher **aleatoriamente**

Isso produz partidas **menos determinísticas e mais interessantes**.

---

# Representação Visual

* **Azul** → Agente 1
* **Vermelho** → Agente 2

As arestas e caixas são coloridas conforme o jogador que as conquistou.

# Como Executar (Jupyter)

1. Abra um notebook (ex: [Google Colab](https://colab.research.google.com/#create=true))
2. Execute os comandos:
 ```
!git clone https://github.com/wchar-t/ia-agente.git
%cd ia-agente/jupyter/
%run dots_and_boxes_ai_styled_notebook.ipynb
 ```

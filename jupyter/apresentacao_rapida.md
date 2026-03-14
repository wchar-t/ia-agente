# Dots and Boxes — Competição entre Agentes Inteligentes

## Visão Geral

Este projeto implementa uma simulação do jogo **Dots and Boxes**, onde **dois agentes inteligentes competem entre si**.

O objetivo é demonstrar conceitos básicos de **Agentes Inteligentes**, como:

- percepção do ambiente
- tomada de decisão
- interação entre agentes
- maximização de recompensa

A aplicação possui uma interface simples com dois controles:

- **Step** → executa uma jogada
- **Autoplay** → executa o jogo automaticamente

## O Jogo

Cada jogador desenha uma aresta entre dois pontos adjacentes.  
Quando completa os quatro lados de uma caixa, ganha **1 ponto** e joga novamente.

## Ambiente

Representação conceitual:

```python
state = {
  "edges": ...,
  "boxes": ...,
  "currentPlayer": ...,
  "scores": ...
}
```

## Classificação do Ambiente

- totalmente observável
- determinístico
- multiagente competitivo
- sequencial
- discreto

## Estratégias dos Agentes

### Agente 1 — Greedy
1. fecha caixas imediatamente
2. evita criar oportunidades para o oponente
3. escolhe a jogada mais segura

### Agente 2 — Heurística com Aleatoriedade
1. fecha caixas quando possível
2. prefere jogadas seguras
3. desempata opções boas de forma aleatória

## Controles

- **Step**: executa uma jogada
- **Autoplay**: executa a partida continuamente
- **Reset**: reinicia a simulação

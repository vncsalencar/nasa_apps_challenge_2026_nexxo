// Brazilian Portuguese for the "effects on the body" card of the trip page (web/src/trip/EffectsCard.tsx).
// The key is the English text. The texts of the effects (title, says, measure, caveat, steps, notes, the
// names of the hazards and of the sources) come from shared/trip/effects.ts. They are in trip-r3.ts.
export const tripW6: Record<string, string> = {
  // The head of the card.
  'Effects on the body': 'Efeitos no corpo',
  'Mission day {day}': 'Dia {day} da missão',
  'Color shows where a hazard of the trip can affect the body, from limits and reports of NASA and other sources. It is not measured body data.':
    'A cor mostra onde um perigo da viagem pode afetar o corpo, a partir de limites e relatos da NASA e de outras fontes. Não são dados medidos no corpo.',
  Figure: 'Figura',

  // The hazards and the filter.
  Hazard: 'Perigo',
  All: 'Todos',
  '{count} active effect': '{count} efeito ativo',
  '{count} active effects': '{count} efeitos ativos',

  // The figure.
  'Whole body': 'Corpo todo',
  'No place on the figure': 'Sem lugar na figura',
  'No hazard affects this part now.': 'Nenhum perigo afeta esta parte agora.',
  'Active effects with no place on the figure': 'Efeitos ativos sem lugar na figura',
  'effect starts': 'o efeito começa',
  'at the limit, or a more serious effect': 'no limite, ou um efeito mais grave',

  // The state of one effect.
  'Reported symptom': 'Sintoma relatado',
  Limit: 'Limite',
  // The base file has "Not reached" for another card, with another text.
  'Not reached now': 'Não atingido agora',
  '{percent}% into the band': '{percent}% dentro da faixa',
  'Reached in full': 'Atingido por completo',
  '{percent}% of the way to the limit': '{percent}% do caminho até o limite',
  'At the limit or past it': 'No limite ou além dele',

  // The state of a rough comparison: the quantity of the charts and the quantity of the source differ.
  'Rough indicator: not reached now': 'Indicador aproximado: não atingido agora',
  'Rough indicator: the number is {percent}% of the number of the limit': 'Indicador aproximado: o número é {percent}% do número do limite',
  'Rough indicator: the number is at the number of the limit or above it': 'Indicador aproximado: o número está no número do limite ou acima dele',
  'Rough indicator: the number is {percent}% into the band of the source': 'Indicador aproximado: o número está {percent}% dentro da faixa da fonte',
  'Rough indicator: the number is at the value of the source or above it': 'Indicador aproximado: o número está no valor da fonte ou acima dele',

  // The detail panel.
  'The detail is open: {name}': 'O detalhe está aberto: {name}',
  'Detail: {name}': 'Detalhe: {name}',
  Close: 'Fechar',
  'What the source reports': 'O que a fonte relata',
  'The comparison now': 'A comparação agora',
  'Limit of this comparison': 'Limite desta comparação',
  'Why this is a rough indicator only': 'Por que isto é só um indicador aproximado',
  'Source:': 'Fonte:',
  'Open the source': 'Abrir a fonte',
  'What you can do': 'O que você pode fazer',
  'our idea': 'ideia nossa',
  'The data has no step for this effect.': 'Os dados não têm nenhuma ação para este efeito.',
  'What the sources also say': 'O que as fontes também dizem',
  'A wider effect also counts here': 'Um efeito mais amplo também vale aqui',
  'No hazard affects this part at this mission day.': 'Nenhum perigo afeta esta parte neste dia da missão.',
  'What can affect this part later': 'O que pode afetar esta parte mais tarde',

  // The panel slot with no selection.
  'No hazard affects the body at this mission day.': 'Nenhum perigo afeta o corpo neste dia da missão.',
  'No effect of this hazard is active at this mission day.': 'Nenhum efeito deste perigo está ativo neste dia da missão.',
  'Select a part of the figure or a row of the list. A panel then shows what can happen there and what you can do.':
    'Selecione uma parte da figura ou uma linha da lista. Um painel mostra então o que pode acontecer ali e o que você pode fazer.',

  // The list.
  'Effects, the strongest first': 'Efeitos, do mais forte ao mais fraco',
  'Show all: {count} more effect is not reached': 'Mostrar todos: mais {count} efeito não foi atingido',
  'Show all: {count} more effects are not reached': 'Mostrar todos: mais {count} efeitos não foram atingidos',
  'Hide the effects that are not reached': 'Ocultar os efeitos não atingidos',

  // The note below the card.
  'The color shows how far a value is into a band or on the way to a limit. A more serious effect gets a stronger color. The order of the strength is our choice. No sensor on a person is behind this figure.':
    'A cor mostra o quanto um valor está dentro de uma faixa ou a caminho de um limite. Um efeito mais grave recebe uma cor mais forte. A ordem da força é uma escolha nossa. Não há nenhum sensor em uma pessoa por trás desta figura.',
  'Some limits and reports use another quantity than the dose of the charts. The app does not convert a dose. Such a comparison is a rough indicator only: it has a dashed bar, and it never gets the full alert color.':
    'Alguns limites e relatos usam uma grandeza diferente da dose dos gráficos. O app não converte doses. Essa comparação é só um indicador aproximado: ela tem uma barra tracejada e nunca recebe a cor de alerta total.',
}

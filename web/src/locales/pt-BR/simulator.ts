// Brazilian Portuguese texts of the simulator page (pages/Admin.tsx).
// The key is the English text, with the same {names} in the translation.
export const simulator: Record<string, string> = {
  // The bar at the top.
  'Clock runs': 'Relógio andando',
  'Clock stopped': 'Relógio parado',
  'No screen open': 'Nenhuma tela aberta',
  '1 screen open': '1 tela aberta',
  '{count} screens open': '{count} telas abertas',
  'Other pages': 'Outras páginas',
  Dashboard: 'Painel',
  'All missions': 'Todas as missões',
  'Open the dashboard': 'Abrir o painel',
  'The page cannot load the mission: {error}': 'A página não consegue carregar a missão: {error}',
  'Each tap changes the audience screen at once.': 'Cada toque muda a tela do público na hora.',

  // The confirmation of the last action. It tells what the simulator did, so the verb is in the past.
  'Error: {text}': 'Erro: {text}',
  'The server did not answer. Check the network.': 'O servidor não respondeu. Verifique a rede.',
  'The action failed.': 'A ação falhou.',
  'The app notified {names}.': 'O app avisou {names}.',
  'The app sent no new notification.': 'O app não enviou nenhuma notificação nova.',
  '1 new question.': '1 pergunta nova.',
  '{count} new questions.': '{count} perguntas novas.',
  'the flight surgeons on the ground': 'os médicos de voo em solo',
  'a crew member': 'um tripulante',

  // 1. What the audience sees.
  'Audience sees': 'O público vê',
  'Crew member. The controls below act on this person.': 'Tripulante. Os controles abaixo agem sobre esta pessoa.',
  'The audience sees {name}.': 'O público vê {name}.',
  'Home view': 'Visão do Início',
  'The audience sees the {view} view.': 'O público vê a visão {view}.',
  Screen: 'Tela',
  'The audience sees the {screen} screen.': 'O público vê a tela {screen}.',
  'The audience sees the home view with no screen open.': 'O público vê o Início, sem nenhuma tela aberta.',
  // The choice "no screen". {screen} is always empty. It keeps this key apart from "None" for a list with no symptom.
  'None{screen}': 'Nenhuma{screen}',

  // 2. The tiles of "Trigger now". {name} is the name of a tile.
  'Trigger now': 'Disparar agora',
  'Cabin CO2 alert': 'Alerta de CO2 da cabine',
  'Radiation alert': 'Alerta de radiação',
  'Hot cabin': 'Cabine quente',
  Fever: 'Febre',
  'Fast heart rate': 'Frequência cardíaca alta',
  'Low blood sugar': 'Glicemia baixa',
  'Bad sleep': 'Sono ruim',
  On: 'Ligado',
  Off: 'Desligado',
  'Now {value}': 'Agora {value}',
  'No value yet': 'Ainda sem valor',
  'sets {value}': 'define {value}',
  'sets {value}, then +{hours} hours': 'define {value}, depois +{hours} horas',
  'Alert goes to {people}': 'O alerta vai para {people}',
  'own value': 'valor próprio',
  '{name} is off. The value is back to the record.': '{name}: desligado. O valor voltou ao registro.',
  '{name} of {person} is off. The value is back to the record.': '{name} de {person}: desligado. O valor voltou ao registro.',
  '{name} is on: {value}.': '{name}: ligado, {value}.',
  '{name} of {person} is on: {value}.': '{name} de {person}: ligado, {value}.',

  // 3. A test alert and a question by hand. The server puts "TESTE" in front of the title.
  'Send a test alert': 'Enviar um alerta de teste',
  To: 'Para',
  'Who gets the test alert': 'Quem recebe o alerta de teste',
  Ground: 'Solo',
  Severity: 'Gravidade',
  Information: 'Informação',
  'Title (optional)': 'Título (opcional)',
  'Title of the test alert (optional)': 'Título do alerta de teste (opcional)',
  Send: 'Enviar',
  'Sent to {names}.': 'Enviado para {names}.',
  'Goes to {names}. The app marks it "TEST".': 'Vai para {names}. O app marca com "TESTE".',
  'Nobody has this role. Choose who gets the alert.': 'Ninguém tem esta função. Escolha quem recebe o alerta.',
  'Ask a question': 'Fazer uma pergunta',
  Question: 'Pergunta',
  'Ask {name}': 'Perguntar a {name}',
  'Asked {name}: "{question}"': 'Pergunta feita a {name}: "{question}"',
  'The mission has no crew member to ask.': 'A missão não tem tripulante para perguntar.',

  // 4. What the app sent.
  'The app sent': 'O app enviou',
  'No notifications.': 'Sem notificações.',
  'To {names}': 'Para {names}',
  'Open questions ({count})': 'Perguntas abertas ({count})',
  'No open questions.': 'Sem perguntas abertas.',
  Yes: 'Sim',
  No: 'Não',
  'Yes, as {name}: {question}': 'Sim, como {name}: {question}',
  'No, as {name}: {question}': 'Não, como {name}: {question}',
  '{name} answered Yes.': '{name} respondeu Sim.',
  '{name} answered No.': '{name} respondeu Não.',
  'Who works on what': 'Quem cuida de quê',
  // The first name of a crew member comes before this text.
  'works on: {topic}': 'cuida de: {topic}',
  // A value of one crew member, for example "Temperatura corporal de Alex Reyes".
  '{label} of {name}': '{label} de {name}',

  // 5. The values. {name} is the label of a value, with the name of the crew member for a body value.
  Values: 'Valores',
  'Set a value of the cabin or of {name} in steps.': 'Mude um valor da cabine ou de {name} em passos.',
  'Set a value of the cabin or of a crew member in steps.': 'Mude um valor da cabine ou de um tripulante em passos.',
  'Set {name} to {value}.': '{name} passou para {value}.',
  '{name} is back to the record.': '{name} voltou ao registro.',
  // The button that gives a value back to the NASA record or to the model.
  Record: 'Registro',
  'Lower {name}': 'Diminuir {name}',
  'Raise {name}': 'Aumentar {name}',

  // 6. The mission clock.
  Clock: 'Relógio',
  '+1 hour': '+1 hora',
  '+6 hours': '+6 horas',
  '+1 day': '+1 dia',
  'To 07:00': 'Até 07:00',
  'To 12:00': 'Até 12:00',
  'The time of the morning values': 'A hora dos valores da manhã',
  'The time of the radiation value': 'A hora do valor de radiação',
  'The clock is at {time} UTC.': 'O relógio está em {time} UTC.',
  'The clock stopped.': 'O relógio parou.',
  'The clock runs: 1 hour each 2 seconds.': 'O relógio anda: 1 hora a cada 2 segundos.',
  'Stop the clock': 'Parar o relógio',
  'Start the clock': 'Iniciar o relógio',

  // 7. Reset.
  Reset: 'Reiniciar',
  'Tap again to confirm': 'Toque de novo para confirmar',
  'Clear alerts': 'Limpar alertas',
  'Reset the mission': 'Reiniciar a missão',
  'Removed the alerts, questions, symptoms and all values of the simulator.': 'Removeu os alertas, as perguntas, os sintomas e todos os valores do simulador.',
  // A confirmation: the simulator did this.
  'Reset the mission to the end of the NASA record.': 'Reiniciou a missão no fim do registro da NASA.',
  '"Clear alerts" removes the alerts, questions, symptoms, claims and all values of the simulator. "Reset the mission" also goes back to the end of the NASA record. The address of the mission stays.':
    '"Limpar alertas" remove os alertas, as perguntas, os sintomas, os "Deixa comigo" e todos os valores do simulador. "Reiniciar a missão" também volta ao fim do registro da NASA. O endereço da missão continua o mesmo.',

  // 8. Setup.
  Setup: 'Preparação',
  'Crew, roles, insights and the history of the mission.': 'Tripulação, funções, análises e o registro da missão.',
  'Crew and roles. The role decides who gets which notification.': 'Tripulação e funções. A função decide quem recebe cada notificação.',
  // {role} is the name of a role from the server, for example "Comandante".
  '{name} is now {role}.': 'A função de {name} agora é: {role}.',
  'Added {name} to the crew.': 'Adicionou {name} à tripulação.',
  'Name of a new crew member': 'Nome de um novo tripulante',
  'Role of the new crew member': 'Função do novo tripulante',
  'Add to the crew': 'Adicionar à tripulação',
  'Insights from a language model': 'Análises de um modelo de linguagem',
  'This part is optional. When it is on, a language model reads the data of the mission and writes a short insight with suggested actions. The check-ups and alerts of the app always work without it.':
    'Esta parte é opcional. Quando está ligada, um modelo de linguagem lê os dados da missão e escreve uma análise curta com ações sugeridas. Os check-ups e os alertas do app sempre funcionam sem ela.',
  'Turn insights on for this mission': 'Ligar as análises para esta missão',
  'Model provider': 'Provedor do modelo',
  Model: 'Modelo',
  'Address of the model server': 'Endereço do servidor do modelo',
  'Ask for an insight when a status changes to alert (one time in 12 mission hours at most)': 'Pedir uma análise quando um status muda para alerta (no máximo uma vez a cada 12 horas de missão)',
  'Send the suggested actions to the roles as notifications': 'Enviar as ações sugeridas às funções como notificações',
  'Saved the settings of the insights.': 'Salvou as configurações das análises.',
  'Asked the language model for an insight.': 'Pediu uma análise ao modelo de linguagem.',
  'History of the mission': 'Registro da missão',
}

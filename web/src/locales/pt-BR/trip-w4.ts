// Brazilian Portuguese for the life support card, the calibration card, and the mission picker of the trip page.
// The key is the English text. The texts that these components share with the CO2 page are in pt-BR.ts.
export const tripW4: Record<string, string> = {
  // Sources (trip/LifeCard.tsx: RefLine).
  'This source has no link yet.': 'Esta fonte ainda não tem link.',

  // The life support card (trip/LifeCard.tsx).
  'Cabin air': 'Ar da cabine',
  'The CO2 and the O2 of the cabin at this point of the mission, from a model of the cabin air.': 'O CO2 e o O2 da cabine neste ponto da missão, a partir de um modelo do ar da cabine.',
  'CO2 partial pressure now': 'Pressão parcial de CO2 agora',
  'Inspired O2 partial pressure now': 'Pressão parcial de O2 inspirado agora',
  '1-hour average {value} mmHg': 'média de 1 hora {value} mmHg',
  'normal range {low} to {high} mmHg': 'faixa normal de {low} a {high} mmHg',
  'Within the NASA limit': 'Dentro do limite da NASA',
  'Above {limit} mmHg now. The 1-hour average is within the limit': 'Acima de {limit} mmHg agora. A média de 1 hora está dentro do limite',
  'The 1-hour average is above the NASA limit': 'A média de 1 hora está acima do limite da NASA',
  'In the normal range': 'Na faixa normal',
  'Below the normal range': 'Abaixo da faixa normal',
  'Above the normal range': 'Acima da faixa normal',
  'The 1-hour average is below {value} mmHg, the lower limit for mild hypoxia': 'A média de 1 hora está abaixo de {value} mmHg, o limite inferior para hipóxia leve',
  'Above {value} mmHg, the upper limit': 'Acima de {value} mmHg, o limite superior',

  // The alerts with a countdown.
  Alerts: 'Alertas',
  'CO2 scrubber on one bed': 'Removedor de CO2 com um leito',
  'CO2 scrubber off': 'Removedor de CO2 desligado',
  'Oxygen generator off': 'Gerador de oxigênio desligado',
  'CO2 reaches {limit} mmHg in {time}': 'O CO2 chega a {limit} mmHg em {time}',
  'CO2 does not reach {limit} mmHg in the next 30 days': 'O CO2 não chega a {limit} mmHg nos próximos 30 dias',
  'CO2 is at or above {limit} mmHg now': 'O CO2 está em {limit} mmHg ou acima agora',
  'CO2 is above {limit} mmHg now. It falls below {limit} mmHg in {time}': 'O CO2 está acima de {limit} mmHg agora. Ele cai abaixo de {limit} mmHg em {time}',
  'O2 falls below {value} mmHg in {time}': 'O O2 cai abaixo de {value} mmHg em {time}',
  'O2 rises above {value} mmHg in {time}': 'O O2 sobe acima de {value} mmHg em {time}',
  'O2 is below {value} mmHg now': 'O O2 está abaixo de {value} mmHg agora',
  'O2 is below {value} mmHg now. It rises above {value} mmHg in {time}': 'O O2 está abaixo de {value} mmHg agora. Ele sobe acima de {value} mmHg em {time}',
  'O2 is above {value} mmHg now': 'O O2 está acima de {value} mmHg agora',
  'O2 is above {value} mmHg now. It falls below {value} mmHg in {time}': 'O O2 está acima de {value} mmHg agora. Ele cai abaixo de {value} mmHg em {time}',
  'O2 stays between {low} and {high} mmHg for the next 30 days': 'O O2 fica entre {low} e {high} mmHg nos próximos 30 dias',
  'No alert: the model keeps the CO2 and the O2 within their limits for the next 30 days.': 'Sem alerta: o modelo mantém o CO2 e o O2 dentro dos limites nos próximos 30 dias.',

  // What the crew does, the daily mean, and the bottles.
  'Crew now': 'Tripulação agora',
  'The crew sleeps': 'A tripulação dorme',
  'The crew does normal work': 'A tripulação faz o trabalho normal',
  'The crew exercises': 'A tripulação faz exercício',
  'Mean CO2 of a full day': 'CO2 médio de um dia inteiro',
  'About the mean CO2 of a full day': 'Sobre o CO2 médio de um dia inteiro',
  'The mean CO2 of a full day with the settings now, after the cabin reached its daily pattern.': 'O CO2 médio de um dia inteiro com os ajustes de agora, depois que a cabine chegou ao seu padrão diário.',
  'No daily level: the CO2 rises': 'Sem nível diário: o CO2 sobe',
  'O2 in the bottles': 'O2 nos cilindros',
  '{mass} kg': '{mass} kg',

  // The two charts and the strip below them.
  'CO2 partial pressure, mmHg': 'Pressão parcial de CO2, mmHg',
  'Inspired O2 partial pressure, mmHg': 'Pressão parcial de O2 inspirado, mmHg',
  'The hours where the crew sleeps and where it exercises': 'As horas em que a tripulação dorme e em que faz exercício',
  'Cabin model': 'Modelo da cabine',
  '3.0 mmHg: NASA limit for the 1-hour average of the CO2': '3,0 mmHg: limite da NASA para a média de 1 hora do CO2',
  '{low} to {high} mmHg: normal range of the O2': '{low} a {high} mmHg: faixa normal do O2',
  '{value} mmHg: lower O2 limit for the 1-hour average (mild hypoxia)': '{value} mmHg: limite inferior do O2 para a média de 1 hora (hipóxia leve)',

  // The state of the systems.
  'State of the systems': 'Estado dos sistemas',
  'CO2 scrubber': 'Removedor de CO2',
  'Oxygen generator': 'Gerador de oxigênio',
  'on, {rate} kg of O2 each day': 'ligado, {rate} kg de O2 por dia',
  off: 'desligado',
  'Sabatier reactor': 'Reator Sabatier',
  'on, O2 loop closure {percent}%': 'ligado, fechamento do ciclo de O2 de {percent}%',
  'About the Sabatier reactor': 'Sobre o reator Sabatier',
  'O2 loop closure: the part of the O2 that the crew uses that comes back from the CO2. The Sabatier reactor makes water from the CO2, and the generator makes O2 from that water. The reactor does not change the gas in the cabin.':
    'Fechamento do ciclo de O2: a parte do O2 usado pela tripulação que volta a partir do CO2. O reator Sabatier produz água a partir do CO2, e o gerador produz O2 a partir dessa água. O reator não muda o gás da cabine.',
  Crew: 'Tripulação',
  Cabin: 'Cabine',
  '{volume} m³ of free volume': '{volume} m³ de volume livre',

  // The notes.
  'Metabolic rates of the model:': 'Taxas metabólicas do modelo:',
  'With these rates and the schedule of the crew, one person makes {co2} kg of CO2 and uses {o2} kg of O2 each day.':
    'Com essas taxas e a rotina da tripulação, uma pessoa produz {co2} kg de CO2 e usa {o2} kg de O2 por dia.',
  'The sources give different rates, so the card names the rates that the model uses.': 'As fontes dão taxas diferentes, por isso o cartão diz quais taxas o modelo usa.',

  // Texts of shared/trip/lifesupport.ts and shared/trip/calibration.ts that these cards show.
  'Inspired O2 partial pressure (PIO2)': 'Pressão parcial de O2 inspirado (PIO2)',
  'PIO2 = (total pressure − 47 mmHg) × O2 fraction of the dry cabin gas': 'PIO2 = (pressão total − 47 mmHg) × fração de O2 do gás seco da cabine',
  'The system must keep the inspired O2 partial pressure (PIO2) in the ranges of table 6.2-1. The target range for normal O2 is 145 to 155 mmHg. The lower limit for mild hypoxia is 127 mmHg as a 1-hour average, with an absolute lower limit of 122 mmHg. The upper limit for an unlimited time is 356 mmHg.':
    'O sistema deve manter a pressão parcial de O2 inspirado (PIO2) nas faixas da tabela 6.2-1. A faixa alvo para O2 normal é de 145 a 155 mmHg. O limite inferior para hipóxia leve é de 127 mmHg como média de 1 hora, com um limite inferior absoluto de 122 mmHg. O limite superior por tempo ilimitado é de 356 mmHg.',
  'NASA handbook rates': 'Taxas do manual da NASA',
  'Long mission, 90 minutes of exercise': 'Missão longa, 90 minutos de exercício',
  'The model gets the crew count of the station only: 6 persons, then 3, then 6. It starts from its own daily pattern for 6 persons, and it does not use a value of the record. The crew follows the default schedule in UTC. The removal of 1.5 times one CDRA is an assumption that was set from this same record, so this check does not prove the level with 6 persons. One sensor sees local effects, and the model does not know when the ground changed the CO2 removal.':
    'O modelo recebe só o número de tripulantes da estação: 6 pessoas, depois 3, depois 6. Ele começa no seu próprio padrão diário para 6 pessoas e não usa nenhum valor do registro. A tripulação segue a rotina padrão em UTC. A remoção de 1,5 vez um CDRA é uma suposição que foi ajustada a partir deste mesmo registro, por isso esta verificação não prova o nível com 6 pessoas. Um sensor vê efeitos locais, e o modelo não sabe quando a equipe em solo mudou a remoção de CO2.',

  // The calibration card (trip/CalibrationCard.tsx).
  'Model check': 'Verificação do modelo',
  'The cabin model next to the real CO2 record of the station during the mission {mission}, with the real crew counts.':
    'O modelo da cabine ao lado do registro real de CO2 da estação durante a missão {mission}, com os números reais de tripulantes.',
  'Station record': 'Registro da estação',
  'Persons on the station': 'Pessoas na estação',
  '{count} person on the station in this part of the record.': '{count} pessoa na estação nesta parte do registro.',
  '{count} persons on the station in this part of the record.': '{count} pessoas na estação nesta parte do registro.',
  'Day {day} of the record': 'Dia {day} do registro',
  'Hour {hour} of the record': 'Hora {hour} do registro',
  Record: 'Registro',
  Model: 'Modelo',
  'CO2 partial pressure in mmHg, by the days from the start of the record': 'Pressão parcial de CO2 em mmHg, pelos dias desde o início do registro',
  'CO2 partial pressure in mmHg, by the hours from the start of the record': 'Pressão parcial de CO2 em mmHg, pelas horas desde o início do registro',
  'A dotted line marks where the crew count changed.': 'Uma linha pontilhada marca onde o número de tripulantes mudou.',
  'Error of the model': 'Erro do modelo',
  'About the error of the model': 'Sobre o erro do modelo',
  'RMS error: the root of the mean of the squared differences between the model and the record. It tells how far the model is from the record at a usual hour.':
    'Erro RMS: a raiz da média dos quadrados das diferenças entre o modelo e o registro. Ele diz a que distância o modelo fica do registro em uma hora comum.',
  'Mean error: the mean of the model minus the record. A negative value means that the model is lower than the record on average.':
    'Erro médio: a média do modelo menos o registro. Um valor negativo significa que o modelo fica abaixo do registro em média.',
  'RMS error {rms} mmHg, mean error {mean} mmHg': 'Erro RMS de {rms} mmHg, erro médio de {mean} mmHg',
  'No data: the record has no value to compare': 'Sem dados: o registro não tem valor para comparar',
  'Calibrated removal': 'Remoção calibrada',
  'The station removes {rate} kg of CO2 each day for each mmHg': 'A estação remove {rate} kg de CO2 por dia para cada mmHg',

  // The mission picker (trip/MissionPicker.tsx).
  Mission: 'Missão',
  'Choose a mission. Each one tells how real its data is.': 'Escolha uma missão. Cada uma diz o quanto seus dados são reais.',
  'Each mission tells how real its data is.': 'Cada missão diz o quanto seus dados são reais.',
  'Low Earth orbit': 'Órbita baixa da Terra',
  Moon: 'Lua',
  Mars: 'Marte',
  'Source of the volume:': 'Fonte do volume:',
  'Assumption: {reason}': 'Suposição: {reason}',
  Trajectory: 'Trajetória',
  'Findings of the mission': 'Resultados da missão',
  Sources: 'Fontes',
  'This mission lists no source yet.': 'Esta missão ainda não lista nenhuma fonte.',
}

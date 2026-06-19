# LGPD e Privacidade - DNA Monster Fitness

Atualizado em: 19/06/2026

Este documento registra a implementação de privacidade do site e da Área do Aluno da DNA Monster Fitness. Ele deve ser revisado sempre que houver mudança em formulários, banco de dados, fornecedores, integrações, finalidades de uso ou regras internas de atendimento.

Referências oficiais:

- Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm
- Direitos dos titulares, ANPD: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares
- Perguntas frequentes da ANPD: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes
- Aviso de Privacidade da ANPD como referência de estrutura: https://www.gov.br/anpd/pt-br/acesso-a-informacao/aviso-de-privacidade

## 1. Escopo implementado no sistema

Foram adicionados ao front-end:

- Política de Privacidade em modal acessível por `Privacidade`, rodapé, formulário e cadastro.
- Banner de privacidade e armazenamento local com aceite persistido em `localStorage`.
- Checkbox obrigatório no formulário de contato.
- Checkbox obrigatório no cadastro da Área do Aluno.
- Validação em JavaScript para impedir cadastro sem aceite da Política de Privacidade.
- Item "Privacidade e dados" no perfil da Área do Aluno para solicitações de direitos do titular.
- Texto documentando dados coletados, finalidades, bases legais, compartilhamento, retenção, direitos do titular, segurança e menores de idade.

Arquivos alterados:

- `index.html`
- `styles.css`
- `site-loader.js`
- `script.js`
- `dist/*`, após build

## 2. Controlador e canal LGPD

Controlador: DNA Monster Fitness.

Canal do titular:

- E-mail: contato@dnmonsterfitness.com
- WhatsApp: (85) 8672-1781

Se a academia for classificada como agente de tratamento de pequeno porte e não indicar encarregado formal, o canal acima deve continuar disponível para titulares de dados. Se houver nomeação de encarregado/DPO, este documento e a Política de Privacidade devem ser atualizados com nome e contato.

## 3. Inventário de dados pessoais

| Área | Dados | Finalidade | Base legal provável |
| --- | --- | --- | --- |
| Formulário de contato | Nome, e-mail, telefone, objetivo | Atendimento comercial e apresentação de serviços | Consentimento |
| WhatsApp | Nome, telefone, objetivo e mensagem enviada pelo usuário | Atendimento e matrícula | Consentimento ou procedimentos preliminares de contrato |
| Cadastro do aluno | Nome, e-mail, telefone, senha criptografada, papel/perfil, status da conta | Criar conta e liberar Área do Aluno | Execução de contrato/procedimentos preliminares e consentimento para o fluxo digital |
| Login e segurança | E-mail, token, tentativas falhas, bloqueio, último acesso, último uso | Autenticação, prevenção a fraude e segurança | Execução de contrato, legítimo interesse e proteção do titular |
| Área do Aluno | Treinos, exercícios, carga, séries, progresso, conclusões, histórico, métricas corporais registradas | Prestação do serviço fitness e acompanhamento técnico | Execução de contrato; avaliar necessidade de consentimento destacado quando houver dado sensível de saúde |
| Avatar/mídia | Imagem enviada pelo usuário | Personalização do perfil | Consentimento |
| Suporte | E-mail, nome, papel, assunto, descrição, status e resposta | Atendimento de solicitações | Execução de contrato, consentimento ou exercício regular de direitos |
| Administração | Listas de alunos, instrutores, treinos, relatórios e chamados | Gestão operacional da academia | Execução de contrato, legítimo interesse e obrigação legal |
| Logs técnicos | IP, navegador, dispositivo, rotas acessadas e erros | Segurança, auditoria e estabilidade | Legítimo interesse e segurança |
| Armazenamento local | Tema, sessão, token, perfil, preferências, histórico local e aceite | Funcionamento da interface e autenticação | Execução de contrato e legítimo interesse |

## 4. Dados sensíveis

Dados de saúde, biometria, medidas corporais, histórico de treino, condicionamento físico ou informações que revelem estado de saúde podem exigir cuidado reforçado. Quando o sistema registrar métricas corporais ou progresso físico, a academia deve:

- Coletar somente o necessário para acompanhamento.
- Explicar a finalidade ao aluno.
- Restringir acesso a alunos, instrutores autorizados e administradores.
- Evitar divulgação pública ou uso comercial não relacionado ao serviço.
- Avaliar consentimento destacado quando o dado for sensível e não houver outra hipótese legal adequada.

## 5. Retenção e descarte

Política recomendada:

- Leads sem matrícula: revisar e excluir ou anonimizar após 180 dias sem interação.
- Conta de aluno ativo: manter enquanto durar o vínculo.
- Conta de aluno inativo: revisar após 24 meses sem vínculo, salvo obrigação legal, financeiro-contábil, defesa de direitos ou solicitação pendente.
- Logs de segurança: manter pelo menor prazo compatível com auditoria e segurança.
- Tickets de suporte: manter enquanto necessário para atendimento, auditoria e defesa de direitos.
- Dados excluídos por solicitação: remover, anonimizar ou bloquear, exceto quando houver obrigação legal ou necessidade de preservação para defesa de direitos.

## 6. Direitos do titular

O titular pode solicitar:

- Confirmação de tratamento.
- Acesso aos dados.
- Correção de dados incompletos, inexatos ou desatualizados.
- Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.
- Portabilidade, quando aplicável.
- Informação sobre compartilhamento.
- Informação sobre possibilidade de negar consentimento e consequências.
- Revogação do consentimento.
- Revisão de decisões automatizadas, se houver.

Procedimento interno:

1. Registrar a solicitação no canal LGPD.
2. Validar identidade do solicitante antes de expor ou alterar dados.
3. Localizar registros em banco, armazenamento de mídia, logs, planilhas e WhatsApp quando aplicável.
4. Responder em linguagem clara.
5. Concluir correção, exportação, bloqueio, anonimização ou exclusão.
6. Registrar data, responsável e providência adotada.

Prazo operacional recomendado: responder confirmações simples imediatamente quando possível e concluir pedidos completos em até 15 dias, salvo complexidade ou previsão legal específica.

## 7. Segurança mínima

Medidas já indicadas pelo projeto:

- Senhas com hash no backend.
- Autenticação por token.
- Perfis de acesso (`ADMIN_GERAL`, `ADMIN`, `INSTRUTOR`, `ALUNO`).
- Rotas administrativas protegidas por middleware.
- Bloqueio por tentativas falhas de login.
- Separação de dados por usuário e papéis.

Medidas que devem ser mantidas ou auditadas:

- HTTPS obrigatório em produção.
- Variáveis de ambiente fora do repositório.
- Backups protegidos e com acesso restrito.
- Revisão periódica de usuários administradores.
- Remoção de contas administrativas antigas.
- Restrição de buckets e mídias que contenham dados pessoais.
- Logs sem exposição de senha, token ou dados excessivos.
- Política de senha e rotação quando houver suspeita de incidente.

## 8. Incidentes de segurança

Fluxo recomendado:

1. Identificar o incidente e sistemas afetados.
2. Conter o acesso indevido.
3. Verificar categorias de dados, quantidade de titulares, riscos e possíveis danos.
4. Registrar linha do tempo, evidências, causa provável e medidas adotadas.
5. Avaliar necessidade de comunicação à ANPD e aos titulares.
6. Corrigir a vulnerabilidade e revisar controles.

Exemplos de incidente: vazamento de banco, acesso indevido de administrador, perda de backup, exposição pública de mídia privada, token comprometido, envio de dados para destinatário incorreto.

## 9. Fornecedores e terceiros

Fornecedores identificados pelo projeto ou pela interface:

- Hospedagem/API: Fly.io ou ambiente configurado no deploy.
- Front-end: Cloudflare Pages, conforme configuração do projeto.
- Banco e mídia: Supabase/Postgres/Storage quando configurado.
- WhatsApp: atendimento externo iniciado pelo usuário.
- Google Maps e Google Fonts: recursos de mapa e fontes.
- CDN jsDelivr: carregamento de recursos quando usado.
- E-mail transacional: Nodemailer/Resend quando configurado.

A academia deve manter lista atualizada de fornecedores, contratos, permissões e finalidade de cada integração.

## 10. Checklist contínuo

- Revisar Política de Privacidade a cada mudança relevante.
- Garantir que todo novo formulário tenha finalidade e base legal.
- Coletar apenas dados necessários.
- Validar permissões de administradores e instrutores mensalmente.
- Remover acessos de ex-colaboradores imediatamente.
- Revisar leads antigos e contas inativas conforme retenção.
- Testar restauração de backup sem expor dados desnecessários.
- Registrar solicitações LGPD e respostas.
- Treinar equipe para não compartilhar dados de alunos fora dos canais autorizados.
- Revisar storage público antes de subir fotos, vídeos ou documentos com dados pessoais.

## 11. Limites desta implementação

Esta implementação adiciona controles e documentação compatíveis com boas práticas de LGPD para o sistema, mas adequação legal completa depende também de operação real da academia: contratos, processos internos, retenção efetiva, segurança do ambiente de produção, treinamento da equipe e resposta a titulares. Recomenda-se revisão por profissional jurídico quando o sistema entrar em produção com dados reais.

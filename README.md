# Claude Code LM Studio API

Um servidor proxy compatível com as APIs da OpenAI e do LM Studio, que utiliza o SDK do Claude Code como backend.  
Permite utilizar as funcionalidades do Claude Code sem alterar os clientes existentes da OpenAI ou do LM Studio (ex: IntelliJ IDEA AI Assistant).

> [!CAUTION]
> As assinaturas Claude Pro e Claude Max são para uso individual. Não permita que outras pessoas utilizem este servidor.

## Funcionalidades

- 🔄 **Compatível com OpenAI API**: Clientes existentes da OpenAI API funcionam sem modificações.
- 🔄 **Compatível com LM Studio API**: Clientes existentes do LM Studio API funcionam sem modificações.
- 🐳 **Suporte Docker**: Início rápido com Docker Compose.
- 🔒 **Segurança**: Ambiente de execução seguro através do isolamento do sistema de arquivos.

## Endpoints Suportados

- ✅ `GET /v1/models` - Lista de modelos disponíveis
- ✅ `POST /v1/chat/completions` - Completar chat (suporta streaming)
- ✅ `POST /v1/completions` - Completar texto (suporta streaming)
- ❌ `POST /v1/embeddings` - Geração de embeddings (não suportado)
- ✅ `GET /health` - Verificação de integridade (health check)
- ✅ `GET /metrics` - Informações de métricas

## Modelos Disponíveis

- `claude-code-auto` - Deixa a seleção do modelo padrão para o Claude Code
- `claude-code-opus` - Utiliza o Opus
- `claude-code-sonnet` - Utiliza o Sonnet

### Sobre a Configuração de Modelos

Comportamento da variável de ambiente `CLAUDE_MODEL`:

- **Se não estiver definida**: Todas as especificações de modelo são usadas como estão.
  - `claude-code-auto` → Seleção do modelo padrão pelo Claude Code
  - `claude-code-opus` → Modelo Opus
  - `claude-code-sonnet` → Modelo Sonnet

- **Se estiver definida** (ex: `CLAUDE_MODEL=sonnet`):
  - `claude-code-auto` → Sobrescrito pelo valor da variável de ambiente
  - `claude-code-opus` → Sobrescrito pelo valor da variável de ambiente
  - `claude-code-sonnet` → Sempre usará o modelo `sonnet` (não é sobrescrito)

Isso permite limitar os modelos disponíveis de acordo com o plano de assinatura (especialmente para o plano Pro).
Ex: Se `CLAUDE_MODEL=sonnet` estiver definido, o modelo `sonnet` será usado mesmo que o cliente especifique `claude-code-auto` ou `claude-code-opus`.

## Início Rápido

### Requisitos

- Docker
- Docker Compose 2.22.0 ou superior
- Assinatura Claude Pro ou Claude Max

### Instalação e Execução

1. Clonar o repositório

```bash
git clone https://github.com/common-creation/claude-code-lmstudio-api.git
cd claude-code-lmstudio-api
```

2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env e realize as configurações necessárias
```

3. Iniciar com Docker Compose

```bash
docker compose up -d
```

4. Configuração (Autenticação do SDK do Claude Code)

```bash
docker compose exec /bin/sh
# Dentro do container
claude
# Realize a autenticação
```

## Exemplos de Uso

### IntelliJ IDEA AI Assistant

Configurações > Ferramentas > AI Assistant > Modelo (Settings > Tools > AI Assistant > Model)

- Provedor de IA de Terceiros (Third-party AI Provider)
  - LM Studio: Ativado
    - URL: http://localhost:1235
    - Execute o teste de conexão e verifique se aparece `✅ Conexão concluída`
- Modelos Locais
  - Disponíveis após o teste de conexão
  - Funções principais: `lmstudio/claude-code-auto`
  - Assistente instantâneo: `lmstudio/claude-code-sonnet`
    - Você também pode especificar `lmstudio/claude-code-opus`, mas não é recomendado usar o Opus para o assistente instantâneo
- Modo Offline: Conforme sua preferência (recomendado ativar)

![](https://i.imgur.com/Sb8VEG9.png)

### Outros

https://lmstudio.ai/docs/app/api/endpoints/rest

## Configuração

### Variáveis de Ambiente

| Nome da Variável | Valor Padrão | Descrição |
|------------------|--------------|-----------|
| PORT | 1235 | Porta de escuta do servidor |
| LOG_LEVEL | info | Nível de log (error, warn, info, debug) |
| TIMEOUT_MS | 30000 | Timeout da requisição (milissegundos) |
| CORS_ENABLED | true | Flag para habilitar CORS |
| CORS_ORIGINS | * | Origens permitidas |
| CLAUDE_TIMEOUT | 30000 | Timeout do SDK do Claude Code (milissegundos) |
| CLAUDE_MODEL | - | Especificação do modelo do Claude Code (opus/sonnet/não definido) |

### Configuração Docker

| Nome da Variável | Valor Padrão | Descrição |
|------------------|--------------|-----------|
| UID | 1000 | ID do usuário dentro do container |
| GID | 1000 | ID do grupo dentro do container |

## Solução de Problemas

### O servidor não inicia

1. Verifique se a porta 1235 não está sendo usada por outro processo
2. Verifique os logs do Docker Compose: `docker compose logs`
3. Verifique se as variáveis de ambiente estão configuradas corretamente

### Erro no SDK do Claude Code / Erro na geração de resposta

1. Verifique as permissões do diretório ~/.claude
2. Verifique se a autenticação da conta do Claude Code dentro do container está configurada corretamente
3. Verifique a conexão de rede

## Licença

MIT License

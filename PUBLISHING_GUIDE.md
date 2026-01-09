# Guia de Publicação da App (Play Store & App Store)

Este guia explica os passos necessários para transformar a sua Web App numa aplicação nativa para publicar nas lojas da Google e da Apple.

## 1. Visão Geral (Custos e Requisitos)

| Loja | Custo | Requisito Principal | Dificuldade |
|------|-------|---------------------|-------------|
| **Google Play Store** (Android) | **25€** (pagamento único) | Conta Google | Média |
| **Apple App Store** (iOS) | **99€ / ano** | **Mac (computador Apple)** obrigatório | Alta |

---

## 2. Google Play Store (Android)

Para Android, o processo é mais simples e pode ser feito no Windows.

### Passo 1: Criar Conta de Programador
1. Aceda à [Google Play Console](https://play.google.com/console).
2. Pague a taxa única de registo ($25 USD / ~25€).
3. Complete a verificação de identidade.

### Passo 2: Gerar a Aplicação (APK/AAB)
Como a sua app é uma Web App, a forma mais fácil é usar uma **TWA (Trusted Web Activity)** ou o **Capacitor**.

**Opção A: Bubblewrap (Recomendada para Windows)**
O Bubblewrap é uma ferramenta da Google que "embrulha" o seu site numa app Android.
1. Instale o Node.js no seu computador.
2. No terminal, corra: `npm install -g @bubblewrap/cli`.
3. Inicie o projeto: `bubblewrap init --manifest=https://oseusite.netlify.app/manifest.json`.
4. Siga os passos para gerar o ficheiro `.aab` (Android App Bundle).

**Opção B: Capacitor (Mais avançada)**
Permite aceder a funções nativas (câmera, notificações).
1. `npm install @capacitor/core @capacitor/cli @capacitor/android`.
2. `npx cap init`.
3. `npx cap add android`.
4. `npx cap open android` (Requer Android Studio instalado).

### Passo 3: Publicar
1. Na Google Play Console, crie uma nova app.
2. Preencha os detalhes (nome, descrição, screenshots).
3. Carregue o ficheiro `.aab` gerado.
4. Responda aos questionários de classificação etária e privacidade.
5. Envie para revisão (demora 2-7 dias).

---

## 3. Apple App Store (iOS)

Para iOS, é **obrigatório** ter um Mac para compilar e enviar a app.

### Passo 1: Conta de Programador Apple
1. Aceda ao [Apple Developer Program](https://developer.apple.com/programs/).
2. Inscreva-se e pague a taxa anual ($99 USD / ~99€).

### Passo 2: Gerar a Aplicação (IPA)
Precisa de usar o **Capacitor** num Mac com **Xcode** instalado.
1. No projeto: `npm install @capacitor/ios`.
2. `npx cap add ios`.
3. `npx cap open ios` (Abre o Xcode).
4. No Xcode, configure as assinaturas e certificados da sua conta Apple.
5. Compile a app ("Archive").

### Passo 3: Publicar
1. Use o **App Store Connect** (acessível via web).
2. Crie a ficha da app (nome, descrição, screenshots).
3. A partir do Xcode, envie a "Build" para o App Store Connect.
4. Submeta para revisão (demora 1-3 dias).

---

## Resumo e Recomendação

Dado que já tem a app a funcionar bem como **PWA (Instalação via Browser)**:

1. **Mantenha a PWA:** É grátis, funciona em ambos os sistemas e atualiza-se automaticamente quando muda o site no Netlify.
2. **Para Android:** Se quiser mesmo estar na loja, use o **Bubblewrap**. É barato (25€) e fazível no Windows.
3. **Para iOS:** Só recomendo se tiver um Mac e estiver disposto a pagar 99€/ano. Caso contrário, a instalação via Safari ("Adicionar ao Ecrã Principal") oferece quase a mesma experiência aos utilizadores.

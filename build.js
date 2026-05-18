#!/usr/bin/env node

/**
 * Script de Build Automatizado
 * Facilita o processo de build para diferentes plataformas
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
    log(`\n📦 ${description}...`, 'blue');
    try {
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} - Concluído!`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} - Falhou!`, 'red');
        return false;
    }
}

function checkPrerequisites() {
    log('\n🔍 Verificando pré-requisitos...', 'yellow');

    const checks = [
        { cmd: 'node --version', name: 'Node.js' },
        { cmd: 'npm --version', name: 'npm' },
    ];

    for (const check of checks) {
        try {
            execSync(check.cmd, { stdio: 'ignore' });
            log(`✅ ${check.name} instalado`, 'green');
        } catch {
            log(`❌ ${check.name} não encontrado!`, 'red');
            return false;
        }
    }

    return true;
}

function buildWeb() {
    log('\n🌐 Iniciando build para WEB...', 'bright');

    if (!execCommand('npx expo export --platform web --clear', 'Build Web')) {
        return false;
    }

    log('\n📁 Arquivos gerados em: dist/', 'green');
    log('💡 Para deploy:', 'yellow');
    log('   - Vercel: vercel --prod', 'yellow');
    log('   - Netlify: netlify deploy --prod --dir=dist', 'yellow');
    log('   - Firebase: firebase deploy --only hosting', 'yellow');

    return true;
}

function buildAndroid(profile = 'preview') {
    log(`\n📱 Iniciando build ANDROID (${profile})...`, 'bright');

    const buildType = profile === 'production' ? 'AAB (Google Play)' : 'APK (Teste)';
    log(`📦 Tipo: ${buildType}`, 'blue');

    if (!execCommand(`eas build --platform android --profile ${profile}`, `Build Android ${profile}`)) {
        return false;
    }

    log('\n✅ Build Android iniciado!', 'green');
    log('🔗 Acompanhe em: https://expo.dev/accounts/[seu-username]/builds', 'yellow');

    return true;
}

function buildIOS(profile = 'production') {
    log('\n🍎 Iniciando build iOS...', 'bright');

    if (!execCommand(`eas build --platform ios --profile ${profile}`, `Build iOS ${profile}`)) {
        return false;
    }

    log('\n✅ Build iOS iniciado!', 'green');
    log('🔗 Acompanhe em: https://expo.dev/accounts/[seu-username]/builds', 'yellow');

    return true;
}

function buildAll(profile = 'production') {
    log('\n🚀 Iniciando build para TODAS as plataformas...', 'bright');

    if (!execCommand(`eas build --platform all --profile ${profile}`, `Build All ${profile}`)) {
        return false;
    }

    log('\n✅ Builds iniciados!', 'green');
    log('🔗 Acompanhe em: https://expo.dev/accounts/[seu-username]/builds', 'yellow');

    return true;
}

function runTests() {
    log('\n🧪 Executando testes...', 'bright');

    const tests = [
        { cmd: 'npm run check', desc: 'TypeScript Check' },
        { cmd: 'npm run lint', desc: 'Lint' },
        { cmd: 'npm test', desc: 'Unit Tests' },
    ];

    for (const test of tests) {
        if (!execCommand(test.cmd, test.desc)) {
            log('\n⚠️  Alguns testes falharam. Deseja continuar? (Ctrl+C para cancelar)', 'yellow');
            return false;
        }
    }

    return true;
}

function showMenu() {
    log('\n╔════════════════════════════════════════════╗', 'bright');
    log('║   Python Notepad++ Mobile - Build Tool    ║', 'bright');
    log('╚════════════════════════════════════════════╝', 'bright');
    log('\nEscolha uma opção:', 'yellow');
    log('1. 🌐 Build Web', 'blue');
    log('2. 📱 Build Android (APK - Teste)', 'blue');
    log('3. 📦 Build Android (AAB - Produção)', 'blue');
    log('4. 🍎 Build iOS (Produção)', 'blue');
    log('5. 🚀 Build Todas as Plataformas', 'blue');
    log('6. 🧪 Executar Testes', 'blue');
    log('7. ❌ Sair', 'blue');
}

async function main() {
    const args = process.argv.slice(2);

    // Verificar pré-requisitos
    if (!checkPrerequisites()) {
        log('\n❌ Pré-requisitos não atendidos!', 'red');
        process.exit(1);
    }

    // Se passou argumentos na linha de comando
    if (args.length > 0) {
        const command = args[0].toLowerCase();

        switch (command) {
            case 'web':
                buildWeb();
                break;
            case 'android':
                buildAndroid(args[1] || 'preview');
                break;
            case 'ios':
                buildIOS(args[1] || 'production');
                break;
            case 'all':
                buildAll(args[1] || 'production');
                break;
            case 'test':
                runTests();
                break;
            default:
                log(`❌ Comando desconhecido: ${command}`, 'red');
                log('\nUso: node build.js [web|android|ios|all|test] [preview|production]', 'yellow');
        }
        return;
    }

    // Menu interativo
    showMenu();

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('\nDigite o número da opção: ', (answer) => {
        readline.close();

        switch (answer.trim()) {
            case '1':
                buildWeb();
                break;
            case '2':
                buildAndroid('preview');
                break;
            case '3':
                buildAndroid('production');
                break;
            case '4':
                buildIOS('production');
                break;
            case '5':
                buildAll('production');
                break;
            case '6':
                runTests();
                break;
            case '7':
                log('\n👋 Até logo!', 'green');
                process.exit(0);
                break;
            default:
                log('\n❌ Opção inválida!', 'red');
        }
    });
}

// Executar
main().catch(error => {
    log(`\n❌ Erro: ${error.message}`, 'red');
    process.exit(1);
});

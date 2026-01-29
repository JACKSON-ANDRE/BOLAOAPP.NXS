import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startOnboardingTour = (path: string, onComplete?: () => void) => {
    let steps: any[] = [];

    const homeSteps = [
        {
            element: '#tour-welcome',
            popover: {
                title: 'Bem-vindo! 🏆',
                description: 'Este é o seu centro de comando. Aqui você vê os destaques e o saldo atual.',
            }
        },
        {
            element: '#tour-add-balance',
            popover: {
                title: 'Recarga Rápida 💰',
                description: 'Precisa de saldo? Clique aqui para gerar um PIX e carregar sua conta na hora.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-balance-game',
            popover: {
                title: 'Saldo de Jogo 🎮',
                description: 'Dinheiro vindo de depósitos, pronto para ser usado nos bolões.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-balance-withdraw',
            popover: {
                title: 'Saldo de Saque 🏆',
                description: 'Seus prêmios e vitórias! Pode sacar via PIX quando quiser.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-pools-list',
            popover: {
                title: 'Bolões Abertos ⚽',
                description: 'Explore a lista e escolha onde quer dar seu palpite premiado!',
                side: 'top',
                align: 'start'
            }
        }
    ];

    const walletSteps = [
        {
            element: '#tour-wallet-auto-pix',
            popover: {
                title: 'PIX Automático ✨',
                description: 'Gere um QR Code e o saldo cai na hora após o pagamento. Sem espera!',
                side: 'top',
                align: 'start'
            }
        },
        {
            element: '#tour-wallet-withdraw',
            popover: {
                title: 'Solicitar Saque 💸',
                description: 'Ganhou? Informe sua chave PIX aqui e receba seus prêmios rapidamente.',
                side: 'top',
                align: 'start'
            }
        },
        {
            element: '#tour-wallet-history',
            popover: {
                title: 'Seu Extrato 📋',
                description: 'Acompanhe detalhadamente todas as suas entradas, saídas e vitórias.',
                side: 'top',
                align: 'start'
            }
        }
    ];

    const createPoolSteps = [
        {
            element: 'form',
            popover: {
                title: 'Criar seu Bolão 🛠️',
                description: 'Preencha os detalhes do evento, times e o valor da entrada.',
                side: 'top',
                align: 'start'
            }
        },
        {
            element: 'button[type="submit"]',
            popover: {
                title: 'Publicar 🚀',
                description: 'Após preencher, publique seu bolão para que outros participem!',
                side: 'top',
                align: 'start'
            }
        }
    ];

    const detailsSteps = [
        {
            element: '#tour-pool-info',
            popover: {
                title: 'Detalhes do Jogo 📑',
                description: 'Veja a data do evento, o prêmio estimado e o número de apostadores.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-pool-options',
            popover: {
                title: 'Escolha seu Lado 🏆',
                description: 'Selecione quem você acha que vai vencer. Analise as opções com calma!',
                side: 'top',
                align: 'start'
            }
        },
        {
            element: '#tour-pool-bet-button',
            popover: {
                title: 'Confirmar Palpite ✅',
                description: 'Pronto para jogar? Clique aqui para confirmar sua entrada no bolão.',
                side: 'top',
                align: 'start'
            }
        },
        {
            element: '#tour-pool-chat',
            popover: {
                title: 'Interagir no Chat 💬',
                description: 'Converse com outros apostadores, provoque seus rivais e acompanhe as novidades.',
                side: 'top',
                align: 'start'
            }
        }
    ];

    // Path detection (HashRouter support)
    const normalizedPath = path.replace('#', '');

    if (normalizedPath === '/' || normalizedPath === '') {
        steps = homeSteps;
    } else if (normalizedPath.includes('/wallet')) {
        steps = walletSteps;
    } else if (normalizedPath.includes('/pools/new')) {
        steps = createPoolSteps;
    } else if (normalizedPath.includes('/pools/')) {
        steps = detailsSteps;
    } else {
        steps = [
            {
                popover: {
                    title: 'Guia do Usuário 💡',
                    description: 'Esta página é intuitiva. Use o menu lateral para navegar entre as principais seções.',
                }
            }
        ];
    }

    const driverObj = driver({
        showProgress: true,
        nextBtnText: 'Próximo —›',
        prevBtnText: '‹— Anterior',
        doneBtnText: 'Entendi! 🎉',
        animate: true,
        allowClose: true,
        overlayColor: '#000',
        overlayOpacity: 0.9,
        stagePadding: 12,
        popoverClass: 'premium-tour-popover',
        steps: steps,
        onDestroyed: () => {
            if (onComplete) onComplete();
        }
    });

    driverObj.drive();
};

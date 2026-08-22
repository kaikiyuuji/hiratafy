import {
    Download,
    EllipsisVertical,
    MonitorDown,
    Share2,
    WifiOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type InstallPlatform = 'ios' | 'android' | 'desktop';

type InstallChoice = {
    outcome: 'accepted' | 'dismissed';
    platform: string;
};

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<InstallChoice>;
}

type PwaContextValue = {
    canInstall: boolean;
    install: () => Promise<void>;
    isInstalled: boolean;
    isOnline: boolean;
};

const PwaContext = createContext<PwaContextValue | null>(null);
const UPDATE_TOAST_ID = 'hiratafy-pwa-update';
const OFFLINE_TOAST_ID = 'hiratafy-pwa-offline';

export function PwaProvider({ children }: { children: ReactNode }) {
    const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
    const [isOnline, setIsOnline] = useState(initialOnlineState);
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [instructionsOpen, setInstructionsOpen] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    const hasControllerRef = useRef(false);
    const refreshingRef = useRef(false);
    const platform: InstallPlatform = detectPlatform();

    useEffect(() => {
        const displayMode = window.matchMedia('(display-mode: standalone)');

        const handleDisplayMode = () => {
            setIsInstalled(isRunningStandalone());
        };
        const handleInstallPrompt = (event: Event) => {
            const promptEvent = event as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setInstallPrompt(promptEvent);
        };
        const handleInstalled = () => {
            setInstallPrompt(null);
            setIsInstalled(true);
            toast.success('Hiratafy instalado', {
                description: 'O aplicativo já está disponível na tela inicial.',
            });
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('Você está sem conexão', {
                id: OFFLINE_TOAST_ID,
                description: 'Consultas e alterações exigem acesso à internet.',
            });
        };
        const handleOnline = () => {
            setIsOnline(true);
            toast.dismiss(OFFLINE_TOAST_ID);
            toast.success('Conexão restaurada', {
                description: 'O Hiratafy voltou a sincronizar com o servidor.',
            });
            void registrationRef.current?.update();
        };

        displayMode.addEventListener('change', handleDisplayMode);
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        window.addEventListener('appinstalled', handleInstalled);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            displayMode.removeEventListener('change', handleDisplayMode);
            window.removeEventListener(
                'beforeinstallprompt',
                handleInstallPrompt,
            );
            window.removeEventListener('appinstalled', handleInstalled);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) {
            return;
        }

        hasControllerRef.current = Boolean(navigator.serviceWorker.controller);

        const handleControllerChange = () => {
            if (!hasControllerRef.current) {
                hasControllerRef.current = true;

                return;
            }

            if (refreshingRef.current) {
                return;
            }

            refreshingRef.current = true;
            window.location.reload();
        };
        const checkForUpdate = () => {
            if (document.visibilityState === 'visible') {
                void registrationRef.current?.update();
            }
        };

        navigator.serviceWorker.addEventListener(
            'controllerchange',
            handleControllerChange,
        );
        document.addEventListener('visibilitychange', checkForUpdate);

        void navigator.serviceWorker
            .register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })
            .then((registration) => {
                registrationRef.current = registration;

                if (
                    registration.waiting &&
                    navigator.serviceWorker.controller
                ) {
                    setUpdateAvailable(true);
                }

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;

                    installingWorker?.addEventListener('statechange', () => {
                        if (
                            installingWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            setUpdateAvailable(true);
                        }
                    });
                });
            })
            .catch(() => {
                // The application remains usable when service workers are unavailable.
            });

        return () => {
            navigator.serviceWorker.removeEventListener(
                'controllerchange',
                handleControllerChange,
            );
            document.removeEventListener('visibilitychange', checkForUpdate);
        };
    }, []);

    const applyUpdate = useCallback(() => {
        const waitingWorker = registrationRef.current?.waiting;

        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });

            return;
        }

        void registrationRef.current?.update();
    }, []);

    useEffect(() => {
        if (!updateAvailable) {
            return;
        }

        toast.info('Atualização disponível', {
            id: UPDATE_TOAST_ID,
            description: 'Recarregue para usar a versão mais recente.',
            duration: Number.POSITIVE_INFINITY,
            action: {
                label: 'Atualizar',
                onClick: applyUpdate,
            },
        });

        return () => {
            toast.dismiss(UPDATE_TOAST_ID);
        };
    }, [applyUpdate, updateAvailable]);

    const install = useCallback(async () => {
        if (isInstalled) {
            return;
        }

        if (!installPrompt) {
            setInstructionsOpen(true);

            return;
        }

        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);

        if (choice.outcome === 'dismissed') {
            toast.info('Instalação cancelada', {
                description: 'Você pode instalar depois pelo menu da conta.',
            });
        }
    }, [installPrompt, isInstalled]);

    const contextValue: PwaContextValue = {
        canInstall: !isInstalled,
        install,
        isInstalled,
        isOnline,
    };

    return (
        <PwaContext.Provider value={contextValue}>
            {children}
            <OfflineStatus isOnline={isOnline} />
            <InstallInstructions
                open={instructionsOpen}
                platform={platform}
                onOpenChange={setInstructionsOpen}
            />
        </PwaContext.Provider>
    );
}

export function usePwa(): PwaContextValue {
    const context = useContext(PwaContext);

    if (!context) {
        throw new Error('usePwa must be used inside PwaProvider.');
    }

    return context;
}

function OfflineStatus({ isOnline }: { isOnline: boolean }) {
    if (isOnline) {
        return null;
    }

    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex justify-center px-3"
            role="status"
            aria-live="assertive"
        >
            <Alert className="pointer-events-auto w-auto max-w-md border-amber-500/35 bg-background/95 py-2 shadow-lg backdrop-blur">
                <WifiOff className="text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-sm">Sem conexão</AlertTitle>
                <AlertDescription className="text-xs">
                    Reconecte-se antes de registrar alterações.
                </AlertDescription>
            </Alert>
        </div>
    );
}

function InstallInstructions({
    open,
    platform,
    onOpenChange,
}: {
    open: boolean;
    platform: InstallPlatform;
    onOpenChange: (open: boolean) => void;
}) {
    const instructions = installInstructions(platform);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Download className="size-5" />
                    </div>
                    <DialogTitle>Instalar o Hiratafy</DialogTitle>
                    <DialogDescription>
                        Use em tela cheia e acesse pelo ícone, como qualquer
                        outro aplicativo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 py-2">
                    {instructions.map((instruction, index) => (
                        <InstallStep
                            key={instruction.title}
                            number={index + 1}
                            title={instruction.title}
                            description={instruction.description}
                        />
                    ))}
                </div>

                <Alert>
                    {platform === 'ios' ? (
                        <Share2 className="size-4" />
                    ) : platform === 'android' ? (
                        <EllipsisVertical className="size-4" />
                    ) : (
                        <MonitorDown className="size-4" />
                    )}
                    <AlertTitle>Atualizações automáticas</AlertTitle>
                    <AlertDescription>
                        O ícone permanece instalado e recebe as melhorias do
                        site sem baixar novas versões.
                    </AlertDescription>
                </Alert>

                <DialogFooter>
                    <Button
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={() => onOpenChange(false)}
                    >
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function InstallStep({
    number,
    title,
    description,
}: {
    number: number;
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-3 rounded-xl border bg-muted/25 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {number}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

function installInstructions(platform: InstallPlatform) {
    if (platform === 'ios') {
        return [
            {
                title: 'Abra no Safari',
                description:
                    'A instalação no iPhone e iPad precisa ser iniciada pelo Safari.',
            },
            {
                title: 'Toque em Compartilhar',
                description:
                    'Use o botão de compartilhar e escolha “Adicionar à Tela de Início”.',
            },
            {
                title: 'Confirme a instalação',
                description:
                    'Ative “Abrir como App da Web” e toque em “Adicionar”.',
            },
        ];
    }

    if (platform === 'android') {
        return [
            {
                title: 'Abra o menu do navegador',
                description:
                    'No Chrome, toque nos três pontos no canto superior da tela.',
            },
            {
                title: 'Escolha instalar',
                description:
                    'Toque em “Instalar app” ou “Adicionar à tela inicial”.',
            },
            {
                title: 'Confirme',
                description:
                    'O Hiratafy aparecerá na tela inicial e na lista de aplicativos.',
            },
        ];
    }

    return [
        {
            title: 'Use o botão de instalação',
            description:
                'Procure o ícone de instalar na barra de endereço do Chrome ou Edge.',
        },
        {
            title: 'Confirme no navegador',
            description:
                'O Hiratafy abrirá em uma janela própria e ficará no menu de aplicativos.',
        },
    ];
}

function isRunningStandalone(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    const standaloneNavigator = navigator as Navigator & {
        standalone?: boolean;
    };

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        standaloneNavigator.standalone === true
    );
}

function initialOnlineState(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function detectPlatform(): InstallPlatform {
    if (typeof navigator === 'undefined') {
        return 'desktop';
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isTouchMac =
        navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    if (/iphone|ipad|ipod/.test(userAgent) || isTouchMac) {
        return 'ios';
    }

    if (userAgent.includes('android')) {
        return 'android';
    }

    return 'desktop';
}

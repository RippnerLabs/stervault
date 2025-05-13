export default function Footer() {
    return (
        <div className="border-t border-neutral-100 dark:border-white/[0.1] px-8 py-20 bg-white dark:bg-neutral-950 w-full relative overflow-hidden">
            <div className="max-w-7xl mx-auto text-sm text-neutral-500 flex sm:flex-row flex-col justify-between items-start  md:px-8">
                <div>
                    <div className="mr-0 md:mr-4  md:flex mb-4">
                        <a
                            className="font-normal flex space-x-2 items-center text-sm mr-4  text-black px-2 py-1  relative z-20"
                            href="/"
                        >
                            <img
                                alt="Rippner Labs logo"
                                loading="lazy"
                                width={30}
                                height={30}
                                decoding="async"
                                data-nimg={1}
                                src="/logo.png"
                                style={{ color: "transparent" }}
                            />
                            <span className="font-medium text-black dark:text-white">
                                Rippner Labs
                            </span>
                        </a>
                    </div>
                    <div className="mt-2 ml-2">
                        © 2024 Rippner Labs. All rights reserved.
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 items-start mt-10 sm:mt-0 md:mt-0">
                    <div className="flex justify-center space-y-4 flex-col w-full">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Platform
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#lending"
                                >
                                    Lending
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#borrowing"
                                >
                                    Borrowing
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#dashboard"
                                >
                                    Dashboard
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#calculator"
                                >
                                    Interest Calculator
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#security"
                                >
                                    Security
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="flex justify-center space-y-4 flex-col">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Social
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="https://x.com/RippnerLabs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Twitter
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="https://discord.gg/RippnerLabs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Discord
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="https://t.me/RippnerLabs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Telegram
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="https://github.com/RippnerLabs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    GitHub
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="flex justify-center space-y-4 flex-col">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Resources
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#documentation"
                                >
                                    Documentation
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#faq"
                                >
                                    FAQ
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#blog"
                                >
                                    Blog
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#governance"
                                >
                                    Governance
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="flex justify-center space-y-4 flex-col">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Legal
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#privacy"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#terms"
                                >
                                    Terms of Service
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#risk"
                                >
                                    Risk Disclosure
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="#security-audit"
                                >
                                    Security Audits
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <p className="text-center mt-20 text-5xl md:text-9xl lg:text-[12rem] xl:text-[13rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 dark:from-neutral-950 to-neutral-200 dark:to-neutral-800 inset-x-0">
                Rippner Labs
            </p>
        </div>

    );
}
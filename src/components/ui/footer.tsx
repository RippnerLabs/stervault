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
                                alt="logo"
                                loading="lazy"
                                width={30}
                                height={30}
                                decoding="async"
                                data-nimg={1}
                                srcSet="/_next/image?url=https%3A%2F%2Fassets.aceternity.com%2Flogo-dark.png&w=32&q=75 1x, /_next/image?url=https%3A%2F%2Fassets.aceternity.com%2Flogo-dark.png&w=64&q=75 2x"
                                src="/_next/image?url=https%3A%2F%2Fassets.aceternity.com%2Flogo-dark.png&w=64&q=75"
                                style={{ color: "transparent" }}
                            />
                            <span className="font-medium text-black dark:text-white">
                                DevStudio
                            </span>
                        </a>
                    </div>
                    <div className="mt-2 ml-2">
                        © copyright DevStudios 2024. All rights reserved.
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 items-start mt-10 sm:mt-0 md:mt-0">
                    <div className="flex justify-center space-y-4 flex-col w-full">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Pages
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    All Products
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Studio
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Clients
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Pricing
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Blog
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="flex justify-center space-y-4 flex-col">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Socials
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Facebook
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Instagram
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Twitter
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    LinkedIn
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
                                    href="/products"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Terms of Service
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Cookie Policy
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="flex justify-center space-y-4 flex-col">
                        <p className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                            Register
                        </p>
                        <ul className="transition-colors hover:text-text-neutral-800 text-neutral-600 dark:text-neutral-300 list-none space-y-4">
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Sign Up
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Login
                                </a>
                            </li>
                            <li className="list-none">
                                <a
                                    className="transition-colors hover:text-text-neutral-800 "
                                    href="/products"
                                >
                                    Forgot Password
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <p className="text-center mt-20 text-5xl md:text-9xl lg:text-[12rem] xl:text-[13rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 dark:from-neutral-950 to-neutral-200 dark:to-neutral-800 inset-x-0">
                DevStudio
            </p>
        </div>

    );
}
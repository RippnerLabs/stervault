"use client";

import React from "react";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { GlareCard } from "@/components/ui/glare-card";
import { FocusCards } from "@/components/ui/focus-cards";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { CardStack } from "@/components/ui/card-stack";
import { LampContainer } from "@/components/ui/lamp";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import {
    Navbar,
    NavBody,
    NavItems,
    MobileNav,
    NavbarLogo,
    NavbarButton,
    MobileNavHeader,
    MobileNavToggle,
    MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import FeaturesSectionDemo from "@/components/ui/features-section-demo-3";
import LayoutGridDemo from "@/components/ui/layout-grid-demo";
import TimelineDemo from "@/components/ui/timeline-demo";
import Footer from "@/components/ui/footer";

export default function HomeUI() {
    return (
        <div className="min-h-screen bg-black text-white">
            <NavbarDemo >

                {/* 1. Hero Section */}
                <HeroSection />

                {/* 2. Featured Highlights */}
                <FeaturedHighlights />

                {/* 3. Live Market Stats */}
                <LiveMarketStats />

                {/* 4. How It Works */}
                <HowItWorks />

                {/* 5. Lending & Borrowing Simulator */}
                {/* <LendingSimulator /> */}

                {/* 6. User Testimonials */}
                {/* <UserTestimonials /> */}

                {/* 7. Security & Transparency */}
                {/* <SecuritySection /> */}

                {/* 8. Roadmap & Future Features */}
                {/* <RoadmapSection /> */}

                {/* 9. Get Started / Call to Action */}
                <CallToAction />

                <Footer />
            </NavbarDemo>
        </div>
    );
}

function NavbarDemo({ children }: { children: React.ReactNode }) {
    const navItems = [
        {
            name: "Features",
            link: "#features",
        },
        {
            name: "Pricing",
            link: "#pricing",
        },
        {
            name: "Contact",
            link: "#contact",
        },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="relative w-full">
            <Navbar>
                {/* Desktop Navigation */}
                <NavBody>
                    <NavbarLogo />
                    <NavItems items={navItems} />
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <NavbarButton variant="secondary">Login</NavbarButton>
                        <NavbarButton variant="primary">Book a call</NavbarButton>
                    </div>
                </NavBody>

                {/* Mobile Navigation */}
                <MobileNav>
                    <MobileNavHeader>
                        <NavbarLogo />
                        <MobileNavToggle
                            isOpen={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        />
                    </MobileNavHeader>

                    <MobileNavMenu
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                    >
                        {navItems.map((item, idx) => (
                            <a
                                key={`mobile-link-${idx}`}
                                href={item.link}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="relative text-neutral-600 dark:text-neutral-300"
                            >
                                <span className="block">{item.name}</span>
                            </a>
                        ))}
                        <div className="flex w-full flex-col gap-4">
                            <NavbarButton
                                onClick={() => setIsMobileMenuOpen(false)}
                                variant="primary"
                                className="w-full"
                            >
                                Login
                            </NavbarButton>
                            <NavbarButton
                                onClick={() => setIsMobileMenuOpen(false)}
                                variant="primary"
                                className="w-full"
                            >
                                Book a call
                            </NavbarButton>
                        </div>
                    </MobileNavMenu>
                </MobileNav>
            </Navbar>
            {children}
        </div>
    );
}

// Custom component to use HeroParallax with the products data
function HeroSection() {
    const products = [
        {
            title: "Moonbeam",
            link: "https://gomoonbeam.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/moonbeam.png",
        },
        {
            title: "Cursor",
            link: "https://cursor.so",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/cursor.png",
        },
        {
            title: "Rogue",
            link: "https://userogue.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/rogue.png",
        },
        {
            title: "Editorially",
            link: "https://editorially.org",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/editorially.png",
        },
        {
            title: "Editrix AI",
            link: "https://editrix.ai",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/editrix.png",
        },
        {
            title: "Pixel Perfect",
            link: "https://app.pixelperfect.quest",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/pixelperfect.png",
        },
        {
            title: "Algochurn",
            link: "https://algochurn.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/algochurn.png",
        },
        {
            title: "Aceternity UI",
            link: "https://ui.aceternity.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/aceternityui.png",
        },
        {
            title: "Tailwind Master Kit",
            link: "https://tailwindmasterkit.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/tailwindmasterkit.png",
        },
        {
            title: "SmartBridge",
            link: "https://smartbridgetech.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/smartbridge.png",
        },
        {
            title: "Renderwork Studio",
            link: "https://renderwork.studio",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/renderwork.png",
        },
        {
            title: "Creme Digital",
            link: "https://cremedigital.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/cremedigital.png",
        },
        {
            title: "Golden Bells Academy",
            link: "https://goldenbellsacademy.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/goldenbellsacademy.png",
        },
        {
            title: "Invoker Labs",
            link: "https://invoker.lol",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/invoker.png",
        },
        {
            title: "E Free Invoice",
            link: "https://efreeinvoice.com",
            thumbnail:
                "https://aceternity.com/images/products/thumbnails/new/efreeinvoice.png",
        },
    ];

    return <HeroParallax products={products} />;
}

// 2. Featured Highlights
function FeaturedHighlights() {
    return (
        <section className="py-10 bg-card">
            <FeaturesSectionDemo />
        </section>
    );
}

// 3. Live Market Stats
function LiveMarketStats() {
    return (
        <LayoutGridDemo />
    );
}

// 4. How It Works
function HowItWorks() {
    return (
        <TimelineDemo />
    );
}

// 5. Lending & Borrowing Simulator
function LendingSimulator() {
    // Sample cards for FocusCards
    const focusCardsData = [
        {
            title: "Lending Opportunities",
            src: "https://via.placeholder.com/400x300?text=Lending",
        },
        {
            title: "Borrowing Options",
            src: "https://via.placeholder.com/400x300?text=Borrowing",
        },
        {
            title: "Market Analysis",
            src: "https://via.placeholder.com/400x300?text=Analysis",
        },
    ];

    return (
        <section className="py-20 bg-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-16">
                    Calculate Your Earnings & Borrowing Costs
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlareCard className="p-8 bg-zinc-800 rounded-xl">
                        <h3 className="text-2xl font-bold mb-4">Lending Simulator</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span>Asset:</span>
                                <span>SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Amount:</span>
                                <span>100 SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span>APY:</span>
                                <span>5.2%</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Yearly Earnings:</span>
                                <span>5.2 SOL</span>
                            </div>
                        </div>
                    </GlareCard>

                    <GlareCard className="p-8 bg-zinc-800 rounded-xl">
                        <h3 className="text-2xl font-bold mb-4">Borrowing Simulator</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span>Asset:</span>
                                <span>USDC</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Amount:</span>
                                <span>100 USDC</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Interest Rate:</span>
                                <span>3.8%</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Yearly Cost:</span>
                                <span>3.8 USDC</span>
                            </div>
                        </div>
                    </GlareCard>
                </div>

                <div className="mt-16">
                    <FocusCards cards={focusCardsData} />
                </div>

                <div className="mt-16 text-center">
                    <TextGenerateEffect words="Simulate your potential earnings and costs with our calculator." className="text-xl" />
                </div>
            </div>
        </section>
    );
}

// 6. User Testimonials
function UserTestimonials() {
    const testimonials = [
        {
            quote: "I never imagined DeFi lending could be this fast and secure!",
            name: "Alice M.",
            designation: "DeFi Enthusiast",
            src: "https://randomuser.me/api/portraits/women/1.jpg",
        },
        {
            quote: "Solana's lending pools have transformed my passive income strategy.",
            name: "Bob T.",
            designation: "Crypto Investor",
            src: "https://randomuser.me/api/portraits/men/1.jpg",
        },
        {
            quote: "The instant transactions make this platform a game-changer.",
            name: "Charlie K.",
            designation: "Blockchain Developer",
            src: "https://randomuser.me/api/portraits/men/2.jpg",
        },
    ];

    return (
        <section className="py-20 bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-16">What Our Users Say</h2>

                <AnimatedTestimonials testimonials={testimonials} />
            </div>
        </section>
    );
}

// 7. Security & Transparency
function SecuritySection() {
    const securityFeatures = [
        {
            id: 1,
            name: "Security Audits",
            designation: "Security Feature",
            content: "Fully audited smart contracts for maximum security.",
        },
        {
            id: 2,
            name: "No Middlemen",
            designation: "Security Feature",
            content: "Direct peer-to-peer lending with no centralized control.",
        },
        {
            id: 3,
            name: "Transparent Governance",
            designation: "Security Feature",
            content: "Decisions made via DAO voting.",
        },
    ];

    const words = [
        {
            text: "Security",
            className: "text-blue-500",
        },
        {
            text: "Transparency",
            className: "text-purple-500",
        },
        {
            text: "Trust",
            className: "text-green-500",
        },
    ];

    return (
        <section className="py-20 bg-zinc-900 relative">
            <LampContainer className="w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <h2 className="text-4xl font-bold text-center mb-16">Security & Transparency</h2>

                    <div className="mb-16">
                        <TypewriterEffect words={words} className="text-center" />
                    </div>

                    <CardStack items={securityFeatures} />
                </div>
            </LampContainer>
        </section>
    );
}

// // 8. Roadmap & Future Features
// function RoadmapSection() {
//     const roadmapItems = [
//         {
//             title: "NFT Collateral Support",
//             description: "Use your NFTs as collateral for borrowing.",
//             image: "https://via.placeholder.com/800x600?text=NFT+Collateral",
//         },
//         {
//             title: "Cross-Chain Lending",
//             description: "Borrow across Solana and Ethereum.",
//             image: "https://via.placeholder.com/800x600?text=Cross+Chain",
//         },
//         {
//             title: "Mobile App Integration",
//             description: "Access lending on the go.",
//             image: "https://via.placeholder.com/800x600?text=Mobile+App",
//         },
//     ];

//     return (
//         <section className="py-20 bg-black">
//             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//                 <h2 className="text-4xl font-bold text-center mb-16">Roadmap & Future Features</h2>

//                 <MacbookScroll
//                     title="Our Roadmap"
//                     showGradient={true}
//                     src="https://via.placeholder.com/1200x800?text=Roadmap"
//                 />

//                 <div className="mt-20">
//                     <ImagesSlider images={roadmapItems.map(item => item.image)}>
//                         <div className="absolute inset-0 flex items-center justify-center text-white">
//                             <div className="text-center">
//                                 <h3 className="text-2xl font-bold">Future Features</h3>
//                                 <p className="text-lg">Swipe to explore our roadmap</p>
//                             </div>
//                         </div>
//                     </ImagesSlider>
//                 </div>

//                 <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
//                     {roadmapItems.map((item, index) => (
//                         <HoverBorderGradient key={index} className="p-8 rounded-xl bg-zinc-900">
//                             <h3 className="text-xl font-bold mb-4">{item.title}</h3>
//                             <p className="text-gray-400">{item.description}</p>
//                         </HoverBorderGradient>
//                     ))}
//                 </div>
//             </div>
//         </section>
//     );
// }

// 9. Get Started / Call to Action
function CallToAction() {
    return (
        <div className="relative overflow-hidden"><section className="relative z-20 mx-auto my-20 grid w-full max-w-7xl grid-cols-1 justify-start bg-gradient-to-br from-gray-100 to-white dark:from-neutral-900 dark:to-neutral-950 md:my-40 md:grid-cols-3"><div className="absolute left-[calc(var(--offset)/2*-1)] h-[var(height)] w-[calc(100%+var(--offset))] bg-[linear-gradient(to_right,var(color),var(color)_50%,transparent_0,transparent)] [background-size:var(width)_var(height)] [mask:linear-gradient(to_left,var(background)_var(fade-stop),transparent),_linear-gradient(to_right,var(background)_var(fade-stop),transparent),_linear-gradient(black,black)] [mask-composite:exclude] z-30 dark:bg-[linear-gradient(to_right,var(color-dark),var(color-dark)_50%,transparent_0,transparent)] top-0" style={{ "background": "#ffffff", "color": "rgba(0, 0, 0, 0.2)", "height": "1px", "width": "5px", }} /><div className="absolute left-[calc(var(--offset)/2*-1)] h-[var(height)] w-[calc(100%+var(--offset))] bg-[linear-gradient(to_right,var(color),var(color)_50%,transparent_0,transparent)] [background-size:var(width)_var(height)] [mask:linear-gradient(to_left,var(background)_var(fade-stop),transparent),_linear-gradient(to_right,var(background)_var(fade-stop),transparent),_linear-gradient(black,black)] [mask-composite:exclude] z-30 dark:bg-[linear-gradient(to_right,var(color-dark),var(color-dark)_50%,transparent_0,transparent)] bottom-0 top-auto" style={{ "background": "#ffffff", "color": "rgba(0, 0, 0, 0.2)", "height": "1px", "width": "5px", }} /><div className="absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(width)] bg-[linear-gradient(to_bottom,var(color),var(color)_50%,transparent_0,transparent)] [background-size:var(width)_var(height)] [mask:linear-gradient(to_top,var(background)_var(fade-stop),transparent),_linear-gradient(to_bottom,var(background)_var(fade-stop),transparent),_linear-gradient(black,black)] [mask-composite:exclude] z-30 dark:bg-[linear-gradient(to_bottom,var(color-dark),var(color-dark)_50%,transparent_0,transparent)] left-0" style={{ "background": "#ffffff", "color": "rgba(0, 0, 0, 0.2)", "height": "5px", "width": "1px", }} /><div className="absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(width)] bg-[linear-gradient(to_bottom,var(color),var(color)_50%,transparent_0,transparent)] [background-size:var(width)_var(height)] [mask:linear-gradient(to_top,var(background)_var(fade-stop),transparent),_linear-gradient(to_bottom,var(background)_var(fade-stop),transparent),_linear-gradient(black,black)] [mask-composite:exclude] z-30 dark:bg-[linear-gradient(to_bottom,var(color-dark),var(color-dark)_50%,transparent_0,transparent)] left-auto right-0" style={{ "background": "#ffffff", "color": "rgba(0, 0, 0, 0.2)", "height": "5px", "width": "1px", }} /><div className="p-8 md:col-span-2 md:p-14"><h2 className="text-left text-xl font-medium tracking-tight text-neutral-500 dark:text-neutral-200 md:text-3xl">Want a professional, extraordinary website tailored to your needs? &nbsp;<span className="font-bold text-black dark:text-white">Get in touch</span></h2><p className="mt-4 max-w-lg text-left text-base font-medium tracking-tight text-neutral-500 dark:text-neutral-200 md:text-base">We've helped thousands of <span className="text-sky-700">founders and teams</span> build their products and apps from scratch, and we can help you too.</p><div className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-4"><div className="mt-6 flex justify-center"><a className="no-underline flex space-x-2 group cursor-pointer transition duration-200 p-px font-semibold px-4 py-2 w-full sm:w-44 h-10 rounded-lg text-sm text-center items-center justify-center relative z-20 bg-black dark:bg-white dark:text-black text-white">Talk to us</a></div></div></div><div className="border-t border-dashed p-8 md:border-l md:border-t-0 md:p-14"><p className="text-base text-neutral-700 dark:text-neutral-200">Manu literally took our requirements and quite literally ran with them. To anyone reading this - I can't recommend Manu enough, your job will be done exceptionally well, and you will be delighted with the end result.</p><div className="mt-4 flex flex-col items-start gap-1 text-sm"><p className="font-bold text-neutral-800 dark:text-neutral-200">John Shahawy</p><p className="text-neutral-500 dark:text-neutral-400">Founder - Moonbeam, Rogue.</p></div></div></section></div>
    );
}

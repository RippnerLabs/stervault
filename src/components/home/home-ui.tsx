"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { FlipWords } from "@/components/ui/flip-words";
import { TextRevealCard } from "@/components/ui/text-reveal-card";
import { Spotlight } from "@/components/ui/spotlight";
import { GlareCard } from "@/components/ui/glare-card";
import { FocusCards } from "@/components/ui/focus-cards";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { CardStack } from "@/components/ui/card-stack";
import { LampContainer } from "@/components/ui/lamp";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { ImagesSlider } from "@/components/ui/images-slider";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundBeams } from "@/components/ui/background-beams";
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
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";

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
            <LendingSimulator />

            {/* 6. User Testimonials */}
            <UserTestimonials />

            {/* 7. Security & Transparency */}
            <SecuritySection />

            {/* 8. Roadmap & Future Features */}
            <RoadmapSection />

            {/* 9. Get Started / Call to Action */}
            <CallToAction />
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


// 1. Hero Section
function HeroSection() {
    return (
        <div className="relative mx-auto my-20 flex flex-col items-center justify-center">
        <div className="absolute inset-y-0 left-0 h-full w-px ">
          <div className="absolute top-0 h-40 w-px " />
        </div>
        <div className="absolute inset-y-0 right-0 h-full w-px ">
          <div className="absolute h-40 w-px " />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px w-full ">
          <div className="absolute mx-auto h-px w-40" />
        </div>
        <div className="px-4 py-10 md:py-20">
          <h1 className="relative z-10 mx-auto max-w-4xl text-center text-2xl font-bold text-slate-700 md:text-4xl lg:text-7xl dark:text-slate-300">
            {"Launch your website in hours, not days"
              .split(" ")
              .map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    ease: "easeInOut",
                  }}
                  className="mr-2 inline-block"
                >
                  {word}
                </motion.span>
              ))}
          </h1>
          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              delay: 0.8,
            }}
            className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-600 dark:text-neutral-400"
          >
            With AI, you can launch your website in hours, not days. Try our best
            in class, state of the art, cutting edge AI tools to get your website
            up.
          </motion.p>
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              delay: 1,
            }}
            className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button className="w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
              Explore Now
            </button>
            <button className="w-60 transform rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900">
              Contact Support
            </button>
          </motion.div>
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.3,
              delay: 1.2,
            }}
            className="relative z-10 mt-20 rounded-3xl border border-neutral-200 bg-neutral-100 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700">
              <Image
                src="https://assets.aceternity.com/pro/aceternity-landing.webp"
                alt="Landing page preview"
                className="aspect-[16/9] h-auto w-full object-cover"
                height={1000}
                width={1000}
              />
            </div>
          </motion.div>
        </div>
      </div>
  
    );
}

// 2. Featured Highlights
function FeaturedHighlights() {
    const features = [
        {
            title: "Low Fees & High APY",
            description: "Earn competitive yields on your assets with minimal fees.",
            icon: "💰",
            link: "#",
        },
        {
            title: "Instant Transactions",
            description: "Leverage Solana's speed for near-instant token lending.",
            icon: "⚡",
            link: "#",
        },
        {
            title: "Secure & Transparent",
            description: "Smart contracts ensure full transparency and security.",
            icon: "🔒",
            link: "#",
        },
        {
            title: "Permissionless Access",
            description: "No sign-ups. Just connect and start lending.",
            icon: "🔑",
            link: "#",
        },
    ];

    return (
        <section className="py-20 bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-16">Why Choose Us?</h2>
                <HoverEffect items={features.map(feature => ({
                    title: feature.title,
                    description: feature.description,
                    link: feature.link,
                }))} />

                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {features.slice(0, 2).map((feature, index) => (
                        <CardContainer key={index} className="w-full h-64">
                            <CardBody className="bg-zinc-900 relative group/card rounded-xl p-6 h-full w-full">
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <CardItem translateZ={50} className="text-4xl mb-4">
                                        {feature.icon}
                                    </CardItem>
                                    <CardItem translateZ={60} className="text-xl font-bold mb-2">
                                        {feature.title}
                                    </CardItem>
                                    <CardItem translateZ={40} className="text-gray-400">
                                        {feature.description}
                                    </CardItem>
                                </div>
                            </CardBody>
                        </CardContainer>
                    ))}
                </div>
            </div>
        </section>
    );
}

// 3. Live Market Stats
function LiveMarketStats() {
    const stats = [
        {
            title: "Total Value Locked",
            value: "$123,456,789",
            icon: "📊",
        },
        {
            title: "Top Lending Pools",
            value: "SOL, USDC, ETH, BTC",
            icon: "🏆",
        },
        {
            title: "Average APY",
            value: "8.5%",
            icon: "📈",
        },
        {
            title: "Recent Transactions",
            value: "User X borrowed 50 SOL from Pool A",
            icon: "🔄",
        },
    ];

    return (
        <section className="py-20 bg-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-16">Live Market Stats</h2>

                <BentoGrid className="max-w-6xl mx-auto">
                    {stats.map((stat, i) => (
                        <BentoGridItem
                            key={i}
                            title={stat.title}
                            description={
                                <AnimatedTooltip
                                    items={[
                                        {
                                            id: i,
                                            name: stat.title,
                                            designation: stat.value,
                                            image: `https://via.placeholder.com/150?text=${stat.icon}`,
                                        },
                                    ]}
                                />
                            }
                            header={
                                <div className="flex items-center justify-center w-full h-full bg-zinc-800 rounded-xl p-4">
                                    <span className="text-4xl">{stat.icon}</span>
                                </div>
                            }
                            className="bg-zinc-800"
                        />
                    ))}
                </BentoGrid>

                <div className="mt-16 text-center">
                    <h3 className="text-2xl font-bold mb-4">Market Trends</h3>
                    <FlipWords
                        words={["Rising APYs", "Increasing TVL", "Growing User Base", "Expanding Markets"]}
                        className="text-xl font-bold"
                    />
                </div>
            </div>
        </section>
    );
}

// 4. How It Works
function HowItWorks() {
    const steps = [
        {
            title: "Connect Your Wallet",
            description: "Use Phantom, Solflare, or any Solana wallet.",
            icon: "👛",
        },
        {
            title: "Deposit Your Assets",
            description: "Supply tokens to earn interest or use them as collateral.",
            icon: "💎",
        },
        {
            title: "Start Lending or Borrowing",
            description: "Get instant liquidity or earn yield effortlessly.",
            icon: "🔄",
        },
    ];

    return (
        <section className="py-20 relative">
            <Spotlight className="hidden sm:block" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <TextRevealCard
                            key={index}
                            text={step.title}
                            revealText={step.description}
                            className="w-full h-64"
                        />
                    ))}
                </div>
            </div>
        </section>
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

// 8. Roadmap & Future Features
function RoadmapSection() {
    const roadmapItems = [
        {
            title: "NFT Collateral Support",
            description: "Use your NFTs as collateral for borrowing.",
            image: "https://via.placeholder.com/800x600?text=NFT+Collateral",
        },
        {
            title: "Cross-Chain Lending",
            description: "Borrow across Solana and Ethereum.",
            image: "https://via.placeholder.com/800x600?text=Cross+Chain",
        },
        {
            title: "Mobile App Integration",
            description: "Access lending on the go.",
            image: "https://via.placeholder.com/800x600?text=Mobile+App",
        },
    ];

    return (
        <section className="py-20 bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-16">Roadmap & Future Features</h2>

                <MacbookScroll
                    title="Our Roadmap"
                    showGradient={true}
                    src="https://via.placeholder.com/1200x800?text=Roadmap"
                />

                <div className="mt-20">
                    <ImagesSlider images={roadmapItems.map(item => item.image)}>
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold">Future Features</h3>
                                <p className="text-lg">Swipe to explore our roadmap</p>
                            </div>
                        </div>
                    </ImagesSlider>
                </div>

                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roadmapItems.map((item, index) => (
                        <HoverBorderGradient key={index} className="p-8 rounded-xl bg-zinc-900">
                            <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                            <p className="text-gray-400">{item.description}</p>
                        </HoverBorderGradient>
                    ))}
                </div>
            </div>
        </section>
    );
}

// 9. Get Started / Call to Action
function CallToAction() {
    return (
        <section className="py-20 relative">
            <BackgroundBeams />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center">
                    <h2 className="text-4xl font-bold mb-8">Ready to Lend or Borrow?</h2>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <HoverBorderGradient className="p-0.5 rounded-xl">
                            <button className="px-8 py-4 rounded-xl bg-black text-white font-bold text-lg">
                                Connect Wallet
                            </button>
                        </HoverBorderGradient>

                        <HoverBorderGradient className="p-0.5 rounded-xl">
                            <button className="px-8 py-4 rounded-xl bg-black text-white font-bold text-lg">
                                Start Lending Now
                            </button>
                        </HoverBorderGradient>
                    </div>
                </div>
            </div>
        </section>
    );
}

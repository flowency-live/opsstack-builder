'use client'

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "https://opsstack.co.uk" },
    { label: "Services", href: "https://opsstack.co.uk/services" },
    { label: "Pricing", href: "https://opsstack.co.uk/pricing" },
    { label: "About", href: "https://opsstack.co.uk/about" },
    { label: "Contact", href: "https://opsstack.co.uk/contact" },
    { label: "Spec Builder", href: "/chat" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-primary/10 bg-background/90 backdrop-blur-xl shadow-lg shadow-primary/5' : 'bg-background/50 backdrop-blur-sm'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="https://opsstack.co.uk" className="flex items-center gap-2 group">
            {/* Using a placeholder for logo - update path if logo exists */}
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-primary font-bold text-lg">OS</span>
            </div>
            <span className="font-display font-semibold text-lg group-hover:text-primary transition-colors duration-300">OpsStack Builder</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('http') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <a href="https://opsstack.co.uk/contact">
              <Button variant="hero" size="sm">
                Book a Session
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors duration-300"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-primary/10 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.href.startsWith('http') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors duration-300"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <a href="https://opsstack.co.uk/contact" onClick={() => setIsOpen(false)}>
                <Button variant="hero" size="sm" className="w-fit">
                  Book a Session
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

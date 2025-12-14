"use client";

import { useState, useRef, useEffect } from "react";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { useWallet } from "@/providers/wallet-provider";
import { useTrading } from "@/providers/trading-provider";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { getDemoWalletLabel } from "@/utils/demo-wallet-label";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { isDemoMode, demoSessionId } = useDemoMode();
  const { eoaAddress, safeAddress: walletSafeAddress, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { safeAddress: tradingSafeAddress, isSafeDeployed, currentStep, error, initializeTrading } = useTrading();

  // Use Safe address from wallet provider (available immediately) or trading provider (available after initialization)
  const safeAddress = walletSafeAddress || tradingSafeAddress;

  // Get deterministic demo wallet label
  const demoLabel = isDemoMode ? getDemoWalletLabel(demoSessionId) : null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle retry after error
  const handleRetry = async () => {
    setIsDropdownOpen(false);
    await initializeTrading();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyAddress = async () => {
    if (safeAddress) {
      await navigator.clipboard.writeText(safeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openPolygonScan = () => {
    if (safeAddress) {
      window.open(`https://polygonscan.com/address/${safeAddress}`, "_blank");
    }
  };

  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    await disconnect();
  };

  // Disconnected state
  if (!isConnected) {
    // In demo mode, show demo label instead of "Connect Wallet"
    const buttonLabel = isDemoMode
      ? demoLabel || "Demo Wallet"
      : isConnecting
      ? "Connecting..."
      : "Connect Wallet";

    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="hidden items-center gap-1.5 lg:gap-2 rounded-lg bg-[#FACC15] px-3 lg:px-4 py-2 text-xs font-semibold text-[#020617] shadow-[0_4px_12px_rgba(250,204,21,0.4)] transition-all hover:bg-[#FCD34D] hover:shadow-[0_6px_16px_rgba(250,204,21,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed md:inline-flex"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span className="hidden lg:inline">{buttonLabel}</span>
      </button>
    );
  }

  // Initializing / deploying / checking / getting credentials - all show loading state
  if (
    currentStep === "initializing" ||
    currentStep === "checking_safe" ||
    currentStep === "deploying_safe" ||
    currentStep === "getting_credentials" ||
    currentStep === "setting_approvals"
  ) {
    const stepLabels: Record<string, string> = {
      initializing: "Initializing...",
      checking_safe: "Checking wallet...",
      deploying_safe: "Sign to create wallet...",
      getting_credentials: "Sign to continue...",
      setting_approvals: "Setting approvals...",
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={false}
          className="hidden items-center gap-1.5 lg:gap-2 rounded-lg bg-[#1E293B] px-3 lg:px-4 py-2 text-xs font-semibold text-white/80 border border-white/10 hover:border-white/20 transition-all md:inline-flex"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden lg:inline">
            {safeAddress ? truncateAddress(safeAddress) : stepLabels[currentStep]}
          </span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-[#0F1629] shadow-xl z-50 overflow-hidden">
            {/* Safe Address */}
            {safeAddress && (
              <div className="p-3 border-b border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  Trading Wallet (Safe)
                </p>
                <p className="text-xs font-mono text-white/80">
                  {truncateAddress(safeAddress)}
                </p>
                <p className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stepLabels[currentStep]}
                </p>
              </div>
            )}

            {/* EOA Address */}
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                {isDemoMode ? demoLabel || "Demo Wallet" : "Connected Wallet (EOA)"}
              </p>
              <p className="text-xs font-mono text-white/80">
                {eoaAddress ? truncateAddress(eoaAddress) : "—"}
              </p>
              {isDemoMode && (
                <p className="text-[9px] text-orange-400 mt-0.5">Demo Mode (No Real Connection)</p>
              )}
            </div>

            {/* Actions */}
            {!isDemoMode && (
              <div className="p-2">
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (currentStep === "error") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="hidden items-center gap-1.5 lg:gap-2 rounded-lg bg-red-500/20 px-3 lg:px-4 py-2 text-xs font-semibold text-red-400 border border-red-500/30 md:inline-flex"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden lg:inline">Error</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-[#0F1629] shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-red-400/60 mb-1">
                Error
              </p>
              <p className="text-xs text-red-400">{error}</p>
            </div>

            {/* Actions */}
            {!isDemoMode && (
              <div className="p-2">
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors mb-1"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Retry
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Ready state - show address with dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="hidden items-center gap-1.5 lg:gap-2 rounded-lg bg-[#1E293B] px-3 lg:px-4 py-2 text-xs font-semibold text-white border border-white/10 hover:border-white/20 hover:bg-[#1E293B]/80 transition-all md:inline-flex"
      >
        <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]" />
        <span className="hidden lg:inline">
          {safeAddress ? truncateAddress(safeAddress) : truncateAddress(eoaAddress!)}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-[#0F1629] shadow-xl z-50 overflow-hidden">
          {/* EOA Address - Show first */}
          <div className="p-3 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              {isDemoMode ? demoLabel || "Demo Wallet" : "Connected Wallet (EOA)"}
            </p>
            <p className="text-xs font-mono text-white/80">
              {eoaAddress ? truncateAddress(eoaAddress) : "—"}
            </p>
            {isDemoMode && (
              <p className="text-[9px] text-orange-400 mt-0.5">Demo Mode (No Real Connection)</p>
            )}
          </div>

          {/* Safe Wallet Status */}
          {safeAddress && (
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Trading Wallet (Safe)
              </p>
              {isSafeDeployed ? (
                <>
                  <p className="text-xs font-mono text-white/80">
                    {truncateAddress(safeAddress)}
                  </p>
                  <p className="text-[10px] text-green-400/80 mt-1 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
                    Deployed & Ready
                  </p>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20 mb-2">
                    <p className="text-[10px] text-yellow-400 font-medium">
                      ⚠️ Safe Wallet Not Deployed
                    </p>
                    <p className="text-[9px] text-yellow-400/70 mt-0.5">
                      Deploy your Safe wallet to start trading
                    </p>
                  </div>
                  <p className="text-xs font-mono text-white/40">
                    {truncateAddress(safeAddress)}
                  </p>
                  <p className="text-[9px] text-white/30 mt-0.5">
                    Predicted address (not deployed yet)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            {!isSafeDeployed && !isDemoMode && (
              <button
                onClick={handleRetry}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-[#FACC15] text-[#020617] font-semibold hover:bg-[#FCD34D] transition-colors mb-1"
              >
                <Wallet className="h-3.5 w-3.5" />
                Deploy Trading Wallet
              </button>
            )}
            {isSafeDeployed && (
              <>
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy Safe Address"}
                </button>
                <button
                  onClick={openPolygonScan}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on PolygonScan
                </button>
              </>
            )}
            {!isDemoMode && (
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

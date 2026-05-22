"use client";

import React from "react";
import { Users, Smile } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import SectionHeading from "../shared/SectionHeading";
import RandomImageAnimation from "./RandomImageAnimation";

const AboutAchievements = () => {
  const t = useTranslations("AboutAchievements");

  return (
    <section className="container mx-auto  px-4 md:px-10">
      <div className="py-5 md:py-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        <div className="flex flex-col justify-center gap-4">
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 md:mt-3">
            <div className="bg-muted rounded-2xl  flex items-center justify-center sm:py-3 px-3">
              <div className="py-3">
                <div className="text-xl md:text-2xl font-bold text-foreground">{t("statCustomers")}</div>
                <p className="text-xs md:text-sm text-muted-foreground">{t("statCustomersLabel")}</p>
              </div>
              <div className="ml-auto flex h-12 w-12 p-2 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="w-8 h-8" />
              </div>
            </div>

            <div className="bg-muted rounded-2xl  flex items-center justify-start sm:py-3 px-3">
              <div className="py-3">
                <div className="text-xl md:text-2xl font-bold text-foreground">{t("statSatisfied")}</div>
                <p className="text-xs md:text-sm text-muted-foreground">{t("statSatisfiedLabel")}</p>
              </div>
              <div className="ml-auto flex h-12 w-12  items-center justify-center rounded-full bg-primary/10 text-primary">
                <Smile className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-start gap-6">
            <p className="text-sm text-muted-foreground">{t("connectText")}</p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              {t("contactButton")}
            </Link>
          </div>
        </div>

        <div className="rounded-[10px] md:rounded-[1rem] overflow-hidden w-full relative min-h-[250px] md:min-h-[250px] lg:min-h-[250px]">
          <RandomImageAnimation />
        </div>
      </div>
    </section>
  );
};

export default AboutAchievements;

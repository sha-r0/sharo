import Contact_CTA from "./components/banner_cta";
import Bottom_CTA from "./components/contact_bottom_cta";
import Contact_cards from "./components/contact_cards";
import Contact_FAQ from "./components/contact_faq";
import Contact_form from "./components/contact_form";
import Contact_hero from "./components/contact_hero";


export default function Home() {
  return (
    <>
    <Contact_hero/>
    <Contact_cards/>
    <Contact_form/>
    <Contact_CTA/>
    <Contact_FAQ/>
    <Bottom_CTA/>
    </>        
    
  );
}
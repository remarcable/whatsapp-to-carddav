import vCard from "vcf";

const DEFAULT_COUNTRY_CALLING_CODE = "49";

export function filterContactsWithNewPhoto(contact) {
  const { card, profile } = contact;
  if (!card.get) {
    // XXX: cannot match vcard tel numbers with leading 0 to whatsapp profiles yet
    console.log(card);
  }
  const cardPhoto = card.get("photo");
  const whatsAppPhoto = profile.image;
  return cardPhoto !== whatsAppPhoto;
}

export function matchWhatsAppProfilesWithVCards(whatsAppProfiles, vCards) {
  const vCardsWithWhatsAppProfile = whatsAppProfiles.map((profile) => {
    const { jid } = profile;
    const whatsAppNumber = jid.split("@")[0];
    const vCard = vCards.find((card) => {
      const cardNumbers = getPhoneNumbersFromVCard(card);
      return cardNumbers.some((cardNumber) =>
        comparePhoneNumbers(whatsAppNumber, cardNumber)
      );
    });

    return { card: vCard, profile };
  });

  return vCardsWithWhatsAppProfile;
}

export function getPhoneNumbersFromVCard(card) {
  const tel = card.get("tel");

  if (!tel) {
    return [];
  }

  const phoneNumbers = (Array.isArray(tel) ? tel : [tel]).map((phoneNumber) =>
    phoneNumber.valueOf().replace(/\s+/g, "")
  );

  return phoneNumbers;
}

export function comparePhoneNumbers(whatsAppNumber, cardNumber) {
  if (!cardNumber) {
    return false;
  }

  if (cardNumber[0] === "+") {
    const numberWithoutPlusSign = cardNumber.substring(1);
    return whatsAppNumber.search(numberWithoutPlusSign) >= 0;
  }

  if (cardNumber[0] === "0" && cardNumber[1] !== "0") {
    return whatsAppNumber.search(cardNumber.substring(1)) >= 0;
  }

  if (cardNumber[1] === "0") {
    return whatsAppNumber.search(cardNumber.substring(2)) >= 0;
  }

  return false;
}

export function updateImageInVCardString(card, base64Image) {
  return new vCard()
    .parse(card)
    .set("photo", base64Image, { encoding: "BASE64", type: "jpeg" })
    .toString();
}

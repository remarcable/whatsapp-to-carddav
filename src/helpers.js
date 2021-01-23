import vCard from "vcf";

export function contactHasNewPhoto(contact) {
  const { card: cardString, profile } = contact;

  if (!cardString) {
    console.log(
      `ERROR: Was not able to match profile of ${profile.jid} to a card`
    );

    return false;
  }

  const whatsAppPhoto = profile.image;
  if (!whatsAppPhoto) {
    return false;
  }

  const cardPhoto = new vCard().parse(cardString).get("photo")?.valueOf();
  return cardPhoto !== whatsAppPhoto;
}

export function matchWhatsAppProfilesWithVCards(whatsAppProfiles, davVCards) {
  const vCardsWithWhatsAppProfile = whatsAppProfiles.map((profile) => {
    const { jid } = profile;
    const whatsAppNumber = jid.split("@")[0];
    const vCard = davVCards.find((davVCards) => {
      const cardNumbers = getPhoneNumbersFromVCardString(davVCards.addressData);
      return cardNumbers.some((cardNumber) =>
        comparePhoneNumbers(whatsAppNumber, cardNumber)
      );
    });

    return { card: vCard, profile };
  });

  return vCardsWithWhatsAppProfile;
}

export function getPhoneNumbersFromVCardString(cardString) {
  const tel = new vCard().parse(cardString).get("tel");

  if (!tel) {
    return [];
  }

  const phoneNumbers = (Array.isArray(tel) ? tel : [tel]).map((phoneNumber) =>
    phoneNumber.valueOf().replace(/\D/g, "")
  );

  return phoneNumbers;
}

export function comparePhoneNumbers(whatsAppNumber, cardNumber) {
  if (!cardNumber) {
    return false;
  }

  if (cardNumber[0] === "0") {
    if (cardNumber[1] === "0") {
      return whatsAppNumber.search(cardNumber.substring(2)) >= 0;
    }

    return whatsAppNumber.search(cardNumber.substring(1)) >= 0;
  }

  return whatsAppNumber === cardNumber;
}

export function updateImageInVCardString(cardString, base64Image) {
  return new vCard()
    .parse(cardString)
    .set("photo", base64Image, { encoding: "BASE64", type: "jpeg" })
    .toString();
}

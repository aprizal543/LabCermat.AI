import os
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

endpoint = os.environ["AZURE_INFERENCE_SDK_ENDPOINT"]
model_name = os.environ.get("DEPLOYMENT_NAME", "labcermat-chat")
api_key = os.environ["AZURE_INFERENCE_CREDENTIAL"]

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(api_key),
)

response = client.complete(
    model=model_name,
    messages=[
        SystemMessage(
            content=(
                "Jawab hanya satu kata: siap"
            )
        ),
        UserMessage(
            content=(
                "Data shift hari ini: "
                "5 sampel menunggu review, "
                "2 sampel prioritas CITO, "
                "1 QC alat hematologi perlu perhatian, "
                "1 sampel minta cek ulang. "
                "Buat ringkasan supervisor dalam 3 poin."
            )
        ),
    ],
    max_tokens=200,
    temperature=0.2,
)

print(response.choices[0].message.content)
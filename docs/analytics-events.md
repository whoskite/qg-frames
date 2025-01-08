# Firebase Analytics Events Reference

## Page Events
- **page_view**
  - Triggered: When a user loads any page
  - Properties: None

## Quote Generation Events
- **generate_quote_click**
  - Triggered: When user clicks "Generate Magic Quote" button
  - Properties:
    - `prompt`: String (user's input or 'empty_prompt')

- **quote_generated_success**
  - Triggered: When a quote is successfully generated
  - Properties:
    - `prompt`: String (user's input or 'empty_prompt')
    - `quote_length`: Number (length of generated quote)
    - `attempts`: Number (number of attempts needed)

- **quote_generated_error**
  - Triggered: When quote generation fails
  - Properties:
    - `prompt`: String (user's input or 'empty_prompt')
    - `error`: String (error message)

## Social Sharing Events
- **cast_created**
  - Triggered: When user clicks "Cast Away" button
  - Properties:
    - `quote`: String (the generated quote being shared)

## GIF Events
- **gif_regenerate_click**
  - Triggered: When user clicks to regenerate a GIF
  - Properties:
    - `quote_text`: String (first 30 chars of current quote)
    - `current_gif_url`: String (URL of current GIF or 'none')

- **gif_regenerated_success**
  - Triggered: When a new GIF is successfully loaded
  - Properties:
    - `quote_text`: String (first 30 chars of current quote)
    - `new_gif_url`: String (URL of new GIF)

- **gif_regenerated_error**
  - Triggered: When GIF regeneration fails
  - Properties:
    - `quote_text`: String (first 30 chars of current quote)
    - `error`: String (error message)

- **gif_fetch_error**
  - Triggered: When GIF fetch fails but quote generation succeeds
  - Properties:
    - `error`: String (error message)

## Future Event Ideas
- Quote character count distribution
- Time spent on page
- Number of quotes generated per session
- Share conversion rate (quotes generated vs shared) 